const Event = require("../models/Event");
const Episode = require("../models/Episode");
const Story = require("../models/Story");
const Character = require("../models/Character");
const Place = require("../models/Place");
const Group = require("../models/Group");
const { deleteUpload } = require("../services/universeTransfer");
const { cleanColors, isHexColor } = require("../utils/colors");
const { imageHandlers } = require("../utils/entityImages");

const IMAGE_FOLDERS = { image: "events/images", background: "events/backgrounds" };
const IMPORTANCE = Event.getAttributes().importance.values;

const includes = [
  { model: Character, as: "characters", attributes: ["id", "firstname", "name", "title", "avatar", "colors"], through: { attributes: [] } },
  { model: Place, as: "places", attributes: ["id", "name", "banner", "background", "colors"], through: { attributes: [] } },
  { model: Group, as: "groups", attributes: ["id", "name", "image", "colors"], through: { attributes: [] } },
  {
    model: Episode,
    as: "episodes",
    attributes: ["id", "title", "order"],
    through: { attributes: [] },
    include: [{ model: Story, as: "stories", attributes: ["id", "name", "colors"], through: { attributes: [] } }],
  },
];
const order = [["order", "ASC"], ["id", "ASC"]];

const toId = (v) => (v === "" || v == null ? null : parseInt(v, 10) || null);
const toIds = (list) => [...new Set(list.map(toId).filter(Boolean))];

function pickEventFields(body) {
  const data = {};
  if (body.name !== undefined) data.name = typeof body.name === "string" ? body.name.trim() : body.name;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.order !== undefined) data.order = toId(body.order);
  if (body.date !== undefined) data.date = typeof body.date === "string" && body.date.trim() ? body.date.trim().slice(0, 255) : null;
  if (body.importance !== undefined) data.importance = IMPORTANCE.includes(body.importance) ? body.importance : null;
  if (body.colors !== undefined) data.colors = cleanColors(body.colors);
  if (body.backgroundColor !== undefined) data.backgroundColor = isHexColor(body.backgroundColor) ? body.backgroundColor.toLowerCase() : null;
  return data;
}

/** Liens de l'événement, modifiés seulement s'ils sont envoyés. */
async function saveLinks(event, body) {
  if (Array.isArray(body.characterIds)) await event.setCharacters(toIds(body.characterIds));
  if (Array.isArray(body.placeIds)) await event.setPlaces(toIds(body.placeIds));
  if (Array.isArray(body.groupIds)) await event.setGroups(toIds(body.groupIds));
  if (Array.isArray(body.episodeIds)) await event.setEpisodes(toIds(body.episodeIds));
}

const loadEventDetail = async (id) => {
  const event = await Event.findByPk(id, { include: includes });
  return event ? event.toJSON() : null;
};

exports.getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.universe_id) where.universe_id = req.query.universe_id;
    res.json(await Event.findAll({ where, include: includes, order }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const event = await loadEventDetail(req.params.id);
    if (!event) return res.status(404).json({ error: "Événement non trouvé" });
    res.json(event);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Création : sans position précisée, l'événement va à la fin de la chronologie
exports.create = async (req, res) => {
  try {
    const data = pickEventFields(req.body);
    if (!data.name) return res.status(400).json({ error: "Le nom de l'événement est requis." });
    const universe_id = toId(req.body.universe_id);
    if (data.order == null) data.order = ((await Event.max("order", { where: { universe_id } })) || 0) + 1;
    const event = await Event.create({ ...data, universe_id });
    await saveLinks(event, req.body);
    res.status(201).json(await loadEventDetail(event.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ error: "Événement non trouvé" });
    const data = pickEventFields(req.body);
    if ("name" in data && !data.name) return res.status(400).json({ error: "Le nom de l'événement est requis." });
    await event.update(data);
    await saveLinks(event, req.body);
    res.json(await loadEventDetail(event.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

/** Nouvel ordre chronologique : { ids: [id, id, ...] } (événements d'un même univers). */
exports.reorder = async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : [];
    await Promise.all(ids.map((id, index) => Event.update({ order: index + 1 }, { where: { id } })));
    const first = ids.length ? await Event.findByPk(ids[0]) : null;
    res.json(await Event.findAll({ where: first ? { universe_id: first.universe_id } : {}, include: includes, order }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const event = await Event.findByPk(req.params.id);
    if (!event) return res.status(404).json({ error: "Événement non trouvé" });
    await event.destroy();
    Object.keys(IMAGE_FOLDERS).forEach((field) => deleteUpload(event[field]));
    res.json({ message: "Événement supprimé avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const images = imageHandlers({ Model: Event, folders: IMAGE_FOLDERS, loadDetail: loadEventDetail, notFound: "Événement non trouvé" });
exports.uploadImageField = images.upload;
exports.deleteImageField = images.remove;
