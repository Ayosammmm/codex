const { CustomEntity } = require("../models/Mod");
const EntityPhoto = require("../models/EntityPhoto");
const { deleteUpload } = require("../services/universeTransfer");
const { activeManifest, entityTypeOf } = require("../services/modAccess");
const { cleanValues } = require("../services/modManifest");
const { cleanColors, isHexColor } = require("../utils/colors");
const { imageHandlers } = require("../utils/entityImages");

/**
 * Entités des types déclarés par les mods (« Artefacts », « Vaisseaux »…).
 * Une seule table pour tous les types : (modId, typeKey) indique le type, `data` les valeurs de ses champs.
 * Type polymorphe pour les éditeurs, collections et photos : `custom`.
 */

const IMAGE_FOLDERS = { image: "custom/images", background: "custom/backgrounds" };
const CARD_ATTRIBUTES = ["id", "name", "image", "colors", "parentId", "modId", "typeKey"];

const listIncludes = [
  { model: CustomEntity, as: "parent", attributes: ["id", "name"] },
  { model: CustomEntity, as: "children", attributes: ["id"] },
];
const detailIncludes = [
  { model: CustomEntity, as: "parent", attributes: ["id", "name"] },
  { model: CustomEntity, as: "children", attributes: CARD_ATTRIBUTES },
];

const toId = (v) => (v === "" || v == null ? null : parseInt(v, 10) || null);

const sendError = (res, error, label) => {
  if (!error.status) console.error(`Erreur ${label} (entité de mod):`, error);
  res.status(error.status || 500).json({ error: error.message });
};

const loadDetail = async (id) => {
  const entity = await CustomEntity.findByPk(id, { include: detailIncludes });
  return entity ? entity.toJSON() : null;
};

/** Champs communs modifiables (les images passent par leurs routes dédiées). */
function pickFields(body) {
  const data = {};
  if (body.name !== undefined) data.name = typeof body.name === "string" ? body.name.trim().slice(0, 255) : body.name;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.parentId !== undefined) data.parentId = toId(body.parentId);
  if (body.colors !== undefined) data.colors = cleanColors(body.colors);
  if (body.backgroundColor !== undefined) data.backgroundColor = isHexColor(body.backgroundColor) ? body.backgroundColor.toLowerCase() : null;
  return data;
}

/** L'entité `parentId` est-elle un parent valide (même type, même univers, pas un descendant) ? */
async function checkParent(entity, parentId) {
  if (parentId == null) return null;
  if (entity.id && parentId === entity.id) return "Une fiche ne peut pas être sa propre parente.";
  const parent = await CustomEntity.findByPk(parentId, { attributes: ["id", "parentId", "modId", "typeKey", "universe_id"] });
  if (!parent || parent.modId !== entity.modId || parent.typeKey !== entity.typeKey || parent.universe_id !== entity.universe_id) {
    return "Fiche parente introuvable.";
  }
  // Remonte la lignée du parent : l'entité ne doit pas y figurer
  let current = parent;
  for (let depth = 0; current?.parentId && depth < 100; depth++) {
    if (entity.id && current.parentId === entity.id) return "Une fiche ne peut pas avoir pour parente une de ses descendantes.";
    current = await CustomEntity.findByPk(current.parentId, { attributes: ["id", "parentId"] });
  }
  return null;
}

// GET /custom-entities?universe_id=&mod=&type= → entités (toutes celles de l'univers si mod/type absents)
exports.getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.universe_id) where.universe_id = req.query.universe_id;
    if (req.query.mod) where.modId = req.query.mod;
    if (req.query.type) where.typeKey = req.query.type;
    res.json(await CustomEntity.findAll({ where, include: listIncludes, order: [["name", "ASC"]] }));
  } catch (error) {
    sendError(res, error, "getAll");
  }
};

exports.getById = async (req, res) => {
  try {
    const entity = await loadDetail(req.params.id);
    if (!entity) return res.status(404).json({ error: "Fiche non trouvée" });
    res.json(entity);
  } catch (error) {
    sendError(res, error, "getById");
  }
};

// POST /custom-entities { universe_id, modId, typeKey, name, data, ... }
exports.create = async (req, res) => {
  try {
    const universeId = toId(req.body.universe_id);
    const { modId, typeKey } = req.body;
    if (!universeId) return res.status(400).json({ error: "Univers requis." });
    const manifest = await activeManifest(universeId, modId);
    const type = entityTypeOf(manifest, typeKey);

    const data = pickFields(req.body);
    if (!data.name) return res.status(400).json({ error: "Le nom est requis." });
    if (!type.hierarchy) data.parentId = null;
    const draft = { id: null, modId, typeKey, universe_id: universeId };
    const parentError = await checkParent(draft, data.parentId ?? null);
    if (parentError) return res.status(400).json({ error: parentError });

    const entity = await CustomEntity.create({
      ...data,
      modId,
      typeKey,
      universe_id: universeId,
      data: cleanValues(type.fields, req.body.data),
    });
    res.status(201).json(await loadDetail(entity.id));
  } catch (error) {
    sendError(res, error, "create");
  }
};

// PUT /custom-entities/:id (seuls les champs envoyés sont modifiés ; `data` : mise à jour partielle)
exports.update = async (req, res) => {
  try {
    const entity = await CustomEntity.findByPk(req.params.id);
    if (!entity) return res.status(404).json({ error: "Fiche non trouvée" });
    const manifest = await activeManifest(entity.universe_id, entity.modId);
    const type = entityTypeOf(manifest, entity.typeKey);

    const data = pickFields(req.body);
    if ("name" in data && !data.name) return res.status(400).json({ error: "Le nom est requis." });
    if (!type.hierarchy) delete data.parentId;
    if ("parentId" in data) {
      const parentError = await checkParent(entity, data.parentId);
      if (parentError) return res.status(400).json({ error: parentError });
    }
    if (req.body.data !== undefined) data.data = cleanValues(type.fields, req.body.data, entity.data || {});

    await entity.update(data);
    res.json(await loadDetail(entity.id));
  } catch (error) {
    sendError(res, error, "update");
  }
};

// DELETE /custom-entities/:id : images et album supprimés ; les descendantes remontent au niveau du parent
exports.delete = async (req, res) => {
  try {
    const entity = await CustomEntity.findByPk(req.params.id);
    if (!entity) return res.status(404).json({ error: "Fiche non trouvée" });

    await CustomEntity.update({ parentId: entity.parentId ?? null }, { where: { parentId: entity.id } });
    const photos = await EntityPhoto.findAll({ where: { entityType: "custom", entityId: entity.id } });
    await EntityPhoto.destroy({ where: { entityType: "custom", entityId: entity.id } });
    await entity.destroy();

    Object.keys(IMAGE_FOLDERS).forEach((field) => deleteUpload(entity[field]));
    photos.forEach((photo) => deleteUpload(photo.imagePath));
    res.json({ message: "Fiche supprimée avec succès" });
  } catch (error) {
    sendError(res, error, "delete");
  }
};

const images = imageHandlers({ Model: CustomEntity, folders: IMAGE_FOLDERS, loadDetail, notFound: "Fiche non trouvée" });
exports.uploadImageField = images.upload;
exports.deleteImageField = images.remove;
exports.IMAGE_FOLDERS = IMAGE_FOLDERS;
