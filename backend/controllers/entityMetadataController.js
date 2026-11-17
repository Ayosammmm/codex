const { EntityMetadata } = require("../models/Mod");
const Character = require("../models/Character");
const Place = require("../models/Place");
const Group = require("../models/Group");
const Specie = require("../models/Specie");
const Creature = require("../models/Creature");
const Story = require("../models/Story");
const Event = require("../models/Event");
const { activeManifest } = require("../services/modAccess");
const { cleanValues, BASE_ENTITY_TYPES } = require("../services/modManifest");

/**
 * Métadonnées des mods sur les entités de base : champs supplémentaires déclarés par `fields` dans
 * le manifeste d'un mod. Une ligne par entité : data = { [modId]: { champ: valeur } }.
 */

const ENTITY_MODELS = {
  character: Character,
  place: Place,
  group: Group,
  specie: Specie,
  creature: Creature,
  story: Story,
  event: Event,
};

const sendError = (res, error, label) => {
  if (!error.status) console.error(`Erreur ${label} (métadonnées):`, error);
  res.status(error.status || 500).json({ error: error.message });
};

// GET /entity-metadata?universe_id= → [{ entityType, entityId, data }]
exports.list = async (req, res) => {
  try {
    const universeId = Number(req.query.universe_id);
    if (!Number.isInteger(universeId)) return res.status(400).json({ error: "Paramètre universe_id requis" });
    const rows = await EntityMetadata.findAll({ where: { universe_id: universeId }, attributes: ["entityType", "entityId", "data"] });
    res.json(rows);
  } catch (error) {
    sendError(res, error, "list");
  }
};

// PUT /entity-metadata/:entityType/:entityId { modId, values } → valeurs du mod remplacées (droits de l'entité)
exports.set = async (req, res) => {
  try {
    const { entityType } = req.params;
    const entityId = Number(req.params.entityId);
    const Model = ENTITY_MODELS[entityType];
    if (!Model || !BASE_ENTITY_TYPES.includes(entityType) || !Number.isInteger(entityId)) {
      return res.status(400).json({ error: "Entité invalide" });
    }
    const entity = await Model.findByPk(entityId, { attributes: ["id", "universe_id"] });
    if (!entity) return res.status(404).json({ error: "Entité non trouvée" });

    const { modId } = req.body || {};
    const manifest = await activeManifest(entity.universe_id, modId);
    const fields = manifest.fields[entityType] || [];
    if (!fields.length) return res.status(400).json({ error: `Le mod « ${manifest.name} » n'ajoute pas de champ à ce type de fiche.` });

    const [row] = await EntityMetadata.findOrCreate({
      where: { entityType, entityId },
      defaults: { universe_id: entity.universe_id, data: {} },
    });
    const all = { ...(row.data || {}) };
    const values = cleanValues(fields, req.body.values, all[modId] || {});
    if (Object.keys(values).length) all[modId] = values;
    else delete all[modId];

    if (Object.keys(all).length) await row.update({ data: all, universe_id: entity.universe_id });
    else await row.destroy();
    res.json({ entityType, entityId, data: all });
  } catch (error) {
    sendError(res, error, "set");
  }
};
