const Episode = require("../models/Episode");
const Story = require("../models/Story");
const Character = require("../models/Character");
const Place = require("../models/Place");
const Event = require("../models/Event");
const EpisodeCharacter = require("../models/EpisodeCharacter");
const { deleteUpload } = require("../services/universeTransfer");
const { isHexColor } = require("../utils/colors");
const { imageHandlers } = require("../utils/entityImages");
const messages = require("../services/messages");

const ROLES = EpisodeCharacter.getAttributes().role.values;
const CHARACTER_ATTRIBUTES = ["id", "firstname", "name", "title", "avatar", "colors"];

const includes = [
  { model: Story, as: "stories", attributes: ["id", "name", "colors"], through: { attributes: [] } },
  { model: Character, as: "characters", attributes: CHARACTER_ATTRIBUTES, through: { attributes: ["role"] } },
  { model: Place, as: "places", attributes: ["id", "name", "banner", "background", "colors"], through: { attributes: [] } },
  { model: Event, as: "events", attributes: ["id", "name", "date", "importance", "order", "image", "colors"], through: { attributes: [] } },
];

const toId = (v) => (v === "" || v == null ? null : parseInt(v, 10) || null);
const toIds = (list) => [...new Set(list.map(toId).filter(Boolean))];

function pickEpisodeFields(body) {
  const data = {};
  if (body.title !== undefined) data.title = typeof body.title === "string" ? body.title.trim() : body.title;
  if (body.order !== undefined) data.order = toId(body.order);
  if (body.backgroundColor !== undefined) data.backgroundColor = isHexColor(body.backgroundColor) ? body.backgroundColor.toLowerCase() : null;
  return data;
}

/**
 * Liens de l'épisode, modifiés seulement s'ils sont envoyés :
 * `characters` [{ characterId, role }] (ou ancien `characterIds`), `placeIds`, `eventIds`.
 */
async function saveLinks(episode, body) {
  let characters = null;
  if (Array.isArray(body.characters)) {
    const seen = new Set();
    characters = body.characters
      .map((c) => ({ id: toId(c.characterId ?? c.id), role: ROLES.includes(c.role) ? c.role : "secondaire" }))
      .filter((c) => c.id && !seen.has(c.id) && seen.add(c.id));
  } else if (Array.isArray(body.characterIds)) {
    characters = body.characterIds.map((c) => (typeof c === "object" ? { id: toId(c.id), role: ROLES.includes(c.role) ? c.role : "secondaire" } : { id: toId(c), role: "secondaire" })).filter((c) => c.id);
  }
  if (characters) {
    await EpisodeCharacter.destroy({ where: { episode_id: episode.id } });
    if (characters.length) {
      await EpisodeCharacter.bulkCreate(characters.map((c) => ({ episode_id: episode.id, character_id: c.id, role: c.role })));
    }
  }
  if (Array.isArray(body.placeIds)) await episode.setPlaces(toIds(body.placeIds));
  if (Array.isArray(body.eventIds)) await episode.setEvents(toIds(body.eventIds));
}

const loadEpisodeDetail = async (id) => {
  const episode = await Episode.findByPk(id, { include: includes });
  return episode ? episode.toJSON() : null;
};

exports.getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.universe_id) where.universe_id = req.query.universe_id;
    res.json(await Episode.findAll({ where, include: includes, order: [["order", "ASC"], ["id", "ASC"]] }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const episode = await loadEpisodeDetail(req.params.id);
    if (!episode) return res.status(404).json({ error: "Épisode non trouvé" });
    res.json(episode);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Création ; `storyId` : l'épisode est ajouté à la fin de cette histoire
exports.create = async (req, res) => {
  try {
    const data = pickEpisodeFields(req.body);
    if (!data.title) return res.status(400).json({ error: "Le titre de l'épisode est requis." });
    const story = toId(req.body.storyId) ? await Story.findByPk(toId(req.body.storyId), { include: [{ model: Episode, as: "episodes", attributes: ["order"] }] }) : null;
    if (story && data.order == null) data.order = Math.max(0, ...story.episodes.map((e) => e.order || 0)) + 1;
    const episode = await Episode.create({ ...data, universe_id: toId(req.body.universe_id) ?? story?.universe_id ?? null });
    if (story) await story.addEpisode(episode);
    await saveLinks(episode, req.body);
    res.status(201).json(await loadEpisodeDetail(episode.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const episode = await Episode.findByPk(req.params.id);
    if (!episode) return res.status(404).json({ error: "Épisode non trouvé" });
    const data = pickEpisodeFields(req.body);
    if ("title" in data && !data.title) return res.status(400).json({ error: "Le titre de l'épisode est requis." });
    await episode.update(data);
    await saveLinks(episode, req.body);
    res.json(await loadEpisodeDetail(episode.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    const episode = await Episode.findByPk(req.params.id);
    if (!episode) return res.status(404).json({ error: "Épisode non trouvé" });
    // Récit : ses messages et leurs pièces jointes
    await messages.destroyMessages({ episodeId: episode.id });
    await episode.destroy();
    deleteUpload(episode.background);
    res.json({ message: "Épisode supprimé avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Image de fond de l'épisode
const images = imageHandlers({ Model: Episode, folders: { background: "episodes/backgrounds" }, loadDetail: loadEpisodeDetail, notFound: "Épisode non trouvé" });
exports.uploadImageField = images.upload;
exports.deleteImageField = images.remove;

// 🔹 Récit de l'épisode, en messages (système commun avec le roleplay : services/messages.js).
// Il s'écrit au nom de n'importe quel personnage de l'univers, par qui peut modifier l'épisode (middlewares/authorize.js).

/** Fond et ambiance de départ du récit : aucun (fond de l'épisode, pas d'ambiance), mais même format que le roleplay. */
const NO_EFFECTS = { background: null, ambience: null };

exports.listMessages = messages.handle("épisode messages", async (req, res) => {
  const episode = await Episode.findByPk(messages.toId(req.params.id), { attributes: ["id"] });
  if (!episode) throw messages.httpError(404, "Épisode non trouvé");
  res.json({ messages: await messages.listMessages({ episodeId: episode.id }), effectsBefore: NO_EFFECTS });
});

exports.uploadMessageAttachments = messages.attachmentsMiddleware("episodes/messages");

// `after` / `before` (id d'un message du récit) : messages insérés juste après / avant lui, sinon ajoutés à la fin
exports.createMessages = messages.handle("épisode messages", async (req, res) => {
  const created = await messages.createMessages(req, async (count) => {
    const episode = await Episode.findByPk(messages.toId(req.params.id), { attributes: ["id", "universe_id"] });
    if (!episode) throw messages.httpError(404, "Épisode non trouvé");
    const sortKeys = await messages.insertionKeys({ episodeId: episode.id }, { after: req.body?.after, before: req.body?.before }, count);
    return { universeId: episode.universe_id, values: { episodeId: episode.id, offThread: true }, linkedOnly: false, sortKeys };
  });
  res.status(201).json(created);
});
