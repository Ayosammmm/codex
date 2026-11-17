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
const { CustomEntity } = require('../models/Mod');
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
  custom: CustomEntity,
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

// Les modifications groupées envoient plusieurs requêtes en parallèle : InnoDB peut alors signaler
// un interblocage sur la table des liens. On réessaie quelques fois avant d'abandonner.
const withDeadlockRetry = async (fn, attempts = 4) => {
  for (let i = 1; ; i++) {
    try {
      return await fn();
    } catch (error) {
      const deadlock = error?.parent?.code === 'ER_LOCK_DEADLOCK' || error?.original?.code === 'ER_LOCK_DEADLOCK';
      if (!deadlock || i >= attempts) throw error;
      await new Promise((resolve) => setTimeout(resolve, 30 * i + Math.random() * 50));
    }
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
    const next = collections.map((c) => c.id);

    // Seuls les liens qui changent sont supprimés / ajoutés (moins de verrous qu'un « tout effacer, tout recréer »)
    await withDeadlockRetry(() =>
      sequelize.transaction(async (transaction) => {
        const current = (await EntityCollection.findAll({ where: { entityType, entityId }, attributes: ['collectionId'], transaction }))
          .map((l) => l.collectionId);
        const removed = current.filter((id) => !next.includes(id));
        const added = next.filter((id) => !current.includes(id));
        if (removed.length) await EntityCollection.destroy({ where: { entityType, entityId, collectionId: removed }, transaction });
        if (added.length) {
          await EntityCollection.bulkCreate(
            added.map((collectionId) => ({ collectionId, entityType, entityId })),
            { transaction, ignoreDuplicates: true },
          );
        }
      }),
    );
    res.json(next);
  } catch (error) {
    console.error('Erreur setLinks (Collection):', error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { ...reference, getLinks, setLinks };
