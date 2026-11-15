const sequelize = require('../config/database');
const Collection = require('../models/Collection');
const EntityCollection = require('../models/EntityCollection');
const Character = require('../models/Character');
const Place = require('../models/Place');
const Group = require('../models/Group');
const Specie = require('../models/Specie');
const Creature = require('../models/Creature');
const Story = require('../models/Story');
const Event = require('../models/Event');
const { referenceController } = require('../utils/referenceController');

// Référentiel « Collection » : liste ordonnée, création, modification, suppression, réordonnancement
const reference = referenceController(Collection, { label: 'Collection', fields: ['color', 'description'] });

const ENTITY_MODELS = {
  character: Character,
  place: Place,
  group: Group,
  specie: Specie,
  creature: Creature,
  story: Story,
  event: Event,
};

/** Tous les liens entité ↔ collection d'un univers : [{ collectionId, entityType, entityId }]. */
const getLinks = async (req, res) => {
  try {
    const universeId = Number(req.query.universe_id);
    if (!Number.isInteger(universeId)) return res.status(400).json({ error: 'Paramètre universe_id requis' });
    const links = await EntityCollection.findAll({
      attributes: ['collectionId', 'entityType', 'entityId'],
      include: [{ model: Collection, attributes: [], where: { universe_id: universeId } }],
      raw: true,
    });
    res.json(links);
  } catch (error) {
    console.error('Erreur getLinks (Collection):', error);
    res.status(500).json({ error: error.message });
  }
};

/** Remplace les collections d'une entité : { collectionIds: [...] } (collections de son univers uniquement). */
const setLinks = async (req, res) => {
  try {
    const { entityType } = req.params;
    const entityId = Number(req.params.entityId);
    const Model = ENTITY_MODELS[entityType];
    if (!Model || !Number.isInteger(entityId)) return res.status(400).json({ error: 'Entité invalide' });
    const entity = await Model.findByPk(entityId, { attributes: ['id', 'universe_id'] });
    if (!entity) return res.status(404).json({ error: 'Entité non trouvée' });

    const wanted = Array.isArray(req.body?.collectionIds) ? [...new Set(req.body.collectionIds.map(Number))] : [];
    const collections = wanted.length
      ? await Collection.findAll({ where: { id: wanted, universe_id: entity.universe_id }, attributes: ['id'] })
      : [];

    await sequelize.transaction(async (transaction) => {
      await EntityCollection.destroy({ where: { entityType, entityId }, transaction });
      if (collections.length) {
        await EntityCollection.bulkCreate(
          collections.map((c) => ({ collectionId: c.id, entityType, entityId })),
          { transaction },
        );
      }
    });
    res.json(collections.map((c) => c.id));
  } catch (error) {
    console.error('Erreur setLinks (Collection):', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { ...reference, getLinks, setLinks };
