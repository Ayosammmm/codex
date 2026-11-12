const Specie = require("../models/Specie");
const Character = require("../models/Character");
const EntityPhoto = require("../models/EntityPhoto");
const { deleteUpload } = require("../services/universeTransfer");
const { cleanColors, isHexColor } = require("../utils/colors");
const { imageHandlers } = require("../utils/entityImages");

const IMAGE_FOLDERS = { image: "species/images", background: "species/backgrounds" };
const CHARACTER_ATTRIBUTES = ["id", "firstname", "name", "title", "avatar", "colors"];
const SPECIE_CARD_ATTRIBUTES = ["id", "name", "image", "colors", "parentId"];

const listIncludes = [
  { model: Specie, as: "parent", attributes: ["id", "name"] },
  { model: Specie, as: "children", attributes: ["id"] },
  { model: Character, as: "characters", attributes: CHARACTER_ATTRIBUTES, through: { attributes: [] } },
];

const detailIncludes = [
  { model: Specie, as: "parent", attributes: ["id", "name"] },
  { model: Specie, as: "children", attributes: SPECIE_CARD_ATTRIBUTES },
  { model: Character, as: "characters", attributes: CHARACTER_ATTRIBUTES, through: { attributes: [] } },
];

const toId = (v) => (v === "" || v == null ? null : parseInt(v, 10) || null);

// Helper : vérifier si une espèce est descendante d'une autre
async function isDescendant(childId, parentId) {
  if (!childId) return false;
  const child = await Specie.findByPk(childId);
  if (!child || !child.parentId) return false;
  if (child.parentId === parentId) return true;
  return isDescendant(child.parentId, parentId);
}

/** Champs modifiables d'une espèce (les images passent par leurs routes dédiées). */
function pickSpecieFields(body) {
  const data = {};
  if (body.name !== undefined) data.name = typeof body.name === "string" ? body.name.trim() : body.name;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.parentId !== undefined) data.parentId = toId(body.parentId);
  if (body.colors !== undefined) data.colors = cleanColors(body.colors);
  if (body.backgroundColor !== undefined) data.backgroundColor = isHexColor(body.backgroundColor) ? body.backgroundColor.toLowerCase() : null;
  return data;
}

/** Vérifie qu'un parent est valide (pas soi-même, pas une sous-espèce). Renvoie un message d'erreur ou null. */
async function checkParent(specieId, parentId) {
  if (parentId == null) return null;
  if (specieId && parentId === Number(specieId)) return "Une espèce ne peut pas être sa propre espèce parente";
  if (specieId && (await isDescendant(parentId, Number(specieId)))) return "Une espèce ne peut pas avoir pour parente une de ses sous-espèces";
  if (!(await Specie.findByPk(parentId))) return "Espèce parente introuvable";
  return null;
}

const loadSpecieDetail = async (id) => {
  const specie = await Specie.findByPk(id, { include: detailIncludes });
  return specie ? specie.toJSON() : null;
};

/** Personnages de l'espèce : modifiés seulement s'ils sont envoyés. */
async function saveCharacters(specie, body) {
  if (Array.isArray(body.characterIds)) {
    await specie.setCharacters([...new Set(body.characterIds.map(toId).filter(Boolean))]);
  }
}

// 🔹 Récupérer toutes les espèces (filtrées par univers)
exports.getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.universe_id) where.universe_id = req.query.universe_id;
    res.json(await Specie.findAll({ where, include: listIncludes, order: [["name", "ASC"]] }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Récupérer une espèce par ID
exports.getById = async (req, res) => {
  try {
    const specie = await loadSpecieDetail(req.params.id);
    if (!specie) return res.status(404).json({ error: "Espèce non trouvée" });
    res.json(specie);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Créer une espèce
exports.create = async (req, res) => {
  try {
    const data = pickSpecieFields(req.body);
    if (!data.name) return res.status(400).json({ error: "Le nom de l'espèce est requis." });
    const parentError = await checkParent(null, data.parentId);
    if (parentError) return res.status(400).json({ error: parentError });

    const specie = await Specie.create({ ...data, universe_id: toId(req.body.universe_id) });
    await saveCharacters(specie, req.body);
    res.status(201).json(await loadSpecieDetail(specie.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Mettre à jour une espèce (seuls les champs envoyés sont modifiés)
exports.update = async (req, res) => {
  try {
    const specie = await Specie.findByPk(req.params.id);
    if (!specie) return res.status(404).json({ error: "Espèce non trouvée" });

    const data = pickSpecieFields(req.body);
    if ("name" in data && !data.name) return res.status(400).json({ error: "Le nom de l'espèce est requis." });
    if ("parentId" in data) {
      const parentError = await checkParent(specie.id, data.parentId);
      if (parentError) return res.status(400).json({ error: parentError });
    }

    await specie.update(data);
    await saveCharacters(specie, req.body);
    res.json(await loadSpecieDetail(specie.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Supprimer une espèce (avec ses images et son album) ; ses sous-espèces remontent au niveau du parent
exports.delete = async (req, res) => {
  try {
    const specie = await Specie.findByPk(req.params.id);
    if (!specie) return res.status(404).json({ error: "Espèce non trouvée" });

    await Specie.update({ parentId: specie.parentId ?? null }, { where: { parentId: specie.id } });
    const photos = await EntityPhoto.findAll({ where: { entityType: "specie", entityId: specie.id } });
    await EntityPhoto.destroy({ where: { entityType: "specie", entityId: specie.id } });
    await specie.destroy();

    Object.keys(IMAGE_FOLDERS).forEach((field) => deleteUpload(specie[field]));
    photos.forEach((photo) => deleteUpload(photo.imagePath));
    res.json({ message: "Espèce supprimée avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Images : illustration (image) et fond (background)
const images = imageHandlers({ Model: Specie, folders: IMAGE_FOLDERS, loadDetail: loadSpecieDetail, notFound: "Espèce non trouvée" });
exports.uploadImageField = images.upload;
exports.deleteImageField = images.remove;
exports.uploadImage = images.upload("image");
exports.deleteImage = images.remove("image");
