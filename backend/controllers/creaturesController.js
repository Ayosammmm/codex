const Creature = require("../models/Creature");
const Place = require("../models/Place");
const PowerRank = require("../models/PowerRank");
const EntityPhoto = require("../models/EntityPhoto");
const { deleteUpload } = require("../services/universeTransfer");
const { cleanColors, isHexColor } = require("../utils/colors");
const { imageHandlers } = require("../utils/entityImages");

const IMAGE_FOLDERS = { image: "creatures/images", background: "creatures/backgrounds" };

const includes = [
  { model: Place, as: "habitats", attributes: ["id", "name", "banner", "background", "colors"], through: { attributes: [] } },
  { model: PowerRank, as: "powerRank", attributes: ["id", "name", "color", "description", "position"] },
];

// Valeurs autorisées des listes (celles du modèle)
const enumValues = (field) => Creature.getAttributes()[field].values;
const ENUM_FIELDS = ["sizeUnit", "activityCycle", "diet", "temperament", "flightBehavior"];
const TEXT_FIELDS = ["averageSize", "speed", "physicalStrength", "endurance", "robustness"];
const LONG_TEXT_FIELDS = ["naturalResistances", "naturalWeaknesses", "attackTypes", "moreDetails"];

const toId = (v) => (v === "" || v == null ? null : parseInt(v, 10) || null);
const toNumber = (v) => (v === "" || v == null || !Number.isFinite(Number(v)) ? null : Number(v));

/** Champs modifiables d'une créature, nettoyés (seuls ceux envoyés sont repris). */
function pickCreatureFields(body) {
  const data = {};
  if (body.name !== undefined) data.name = typeof body.name === "string" ? body.name.trim() : body.name;
  if (body.powerRankId !== undefined) data.powerRankId = toId(body.powerRankId);
  for (const f of TEXT_FIELDS) if (body[f] !== undefined) data[f] = typeof body[f] === "string" && body[f].trim() ? body[f].trim().slice(0, 255) : null;
  for (const f of LONG_TEXT_FIELDS) if (body[f] !== undefined) data[f] = body[f] || null;
  for (const f of ENUM_FIELDS) if (body[f] !== undefined) data[f] = enumValues(f).includes(body[f]) ? body[f] : null;
  if (body.averageWeight !== undefined) data.averageWeight = toNumber(body.averageWeight);
  if (body.lifeExpectancy !== undefined) data.lifeExpectancy = toNumber(body.lifeExpectancy) == null ? null : Math.round(toNumber(body.lifeExpectancy));
  if (body.intelligence !== undefined) {
    const v = toNumber(body.intelligence);
    data.intelligence = v == null ? null : Math.min(10, Math.max(0, Math.round(v)));
  }
  if (body.colors !== undefined) data.colors = cleanColors(body.colors);
  if (body.backgroundColor !== undefined) data.backgroundColor = isHexColor(body.backgroundColor) ? body.backgroundColor.toLowerCase() : null;
  return data;
}

/** Habitats : modifiés seulement s'ils sont envoyés. */
async function saveHabitats(creature, body) {
  if (Array.isArray(body.placeIds)) {
    await creature.setHabitats([...new Set(body.placeIds.map(toId).filter(Boolean))]);
  }
}

const loadCreatureDetail = async (id) => {
  const creature = await Creature.findByPk(id, { include: includes });
  return creature ? creature.toJSON() : null;
};

// 🔹 Récupérer toutes les créatures (filtrées par univers)
exports.getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.universe_id) where.universe_id = req.query.universe_id;
    res.json(await Creature.findAll({ where, include: includes, order: [["name", "ASC"]] }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Récupérer une créature par ID
exports.getById = async (req, res) => {
  try {
    const creature = await loadCreatureDetail(req.params.id);
    if (!creature) return res.status(404).json({ error: "Créature non trouvée" });
    res.json(creature);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Créer une créature
exports.create = async (req, res) => {
  try {
    const data = pickCreatureFields(req.body);
    if (!data.name) return res.status(400).json({ error: "Le nom de la créature est requis." });
    const creature = await Creature.create({ ...data, universe_id: toId(req.body.universe_id) });
    await saveHabitats(creature, req.body);
    res.status(201).json(await loadCreatureDetail(creature.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Mettre à jour une créature (seuls les champs envoyés sont modifiés)
exports.update = async (req, res) => {
  try {
    const creature = await Creature.findByPk(req.params.id);
    if (!creature) return res.status(404).json({ error: "Créature non trouvée" });
    const data = pickCreatureFields(req.body);
    if ("name" in data && !data.name) return res.status(400).json({ error: "Le nom de la créature est requis." });
    await creature.update(data);
    await saveHabitats(creature, req.body);
    res.json(await loadCreatureDetail(creature.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Supprimer une créature (avec ses images et son album)
exports.delete = async (req, res) => {
  try {
    const creature = await Creature.findByPk(req.params.id);
    if (!creature) return res.status(404).json({ error: "Créature non trouvée" });

    const photos = await EntityPhoto.findAll({ where: { entityType: "creature", entityId: creature.id } });
    await EntityPhoto.destroy({ where: { entityType: "creature", entityId: creature.id } });
    await creature.destroy();

    Object.keys(IMAGE_FOLDERS).forEach((field) => deleteUpload(creature[field]));
    photos.forEach((photo) => deleteUpload(photo.imagePath));
    res.json({ message: "Créature supprimée avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Images : illustration (image) et fond (background)
const images = imageHandlers({ Model: Creature, folders: IMAGE_FOLDERS, loadDetail: loadCreatureDetail, notFound: "Créature non trouvée" });
exports.uploadImageField = images.upload;
exports.deleteImageField = images.remove;
exports.uploadImage = images.upload("image");
exports.deleteImage = images.remove("image");
