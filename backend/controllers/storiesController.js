const { Op } = require("sequelize");
const Story = require("../models/Story");
const Episode = require("../models/Episode");
const Character = require("../models/Character");
const Place = require("../models/Place");
const Event = require("../models/Event");
const { deleteUpload } = require("../services/universeTransfer");
const { cleanColors, isHexColor } = require("../utils/colors");
const { imageHandlers } = require("../utils/entityImages");

const IMAGE_FOLDERS = { image: "stories/images", background: "stories/backgrounds" };
const CHARACTER_ATTRIBUTES = ["id", "firstname", "name", "title", "avatar", "colors"];

const listIncludes = [
  {
    model: Episode,
    as: "episodes",
    attributes: ["id", "title", "order"],
    through: { attributes: [] },
    include: [{ model: Character, as: "characters", attributes: CHARACTER_ATTRIBUTES, through: { attributes: ["role"] } }],
  },
];

const detailIncludes = [
  {
    model: Episode,
    as: "episodes",
    attributes: ["id", "title", "description", "order"],
    through: { attributes: [] },
    include: [
      { model: Character, as: "characters", attributes: CHARACTER_ATTRIBUTES, through: { attributes: ["role"] } },
      { model: Place, as: "places", attributes: ["id", "name"], through: { attributes: [] } },
      { model: Event, as: "events", attributes: ["id", "name", "date", "importance", "order", "colors"], through: { attributes: [] } },
    ],
  },
];
const episodeOrder = [[{ model: Episode, as: "episodes" }, "order", "ASC"], [{ model: Episode, as: "episodes" }, "id", "ASC"]];

const toId = (v) => (v === "" || v == null ? null : parseInt(v, 10) || null);
const shortText = (v) => (typeof v === "string" && v.trim() ? v.trim().slice(0, 255) : null);

function pickStoryFields(body) {
  const data = {};
  if (body.name !== undefined) data.name = typeof body.name === "string" ? body.name.trim() : body.name;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.startDate !== undefined) data.startDate = shortText(body.startDate);
  if (body.endDate !== undefined) data.endDate = shortText(body.endDate);
  if (body.colors !== undefined) data.colors = cleanColors(body.colors);
  if (body.backgroundColor !== undefined) data.backgroundColor = isHexColor(body.backgroundColor) ? body.backgroundColor.toLowerCase() : null;
  return data;
}

/**
 * Épisodes de l'histoire, dans l'ordre : [{ id?, title }]. Les nouveaux (sans id) sont créés,
 * les titres et l'ordre mis à jour. Un épisode retiré qui n'appartient à aucune autre histoire est supprimé.
 * Ancien format accepté : `episodeIds` [id] (association seule).
 */
async function saveEpisodes(story, body) {
  if (Array.isArray(body.episodes)) {
    const before = (await story.getEpisodes({ attributes: ["id"] })).map((e) => e.id);
    const ids = [];
    for (const [index, item] of body.episodes.entries()) {
      const title = shortText(item?.title);
      const id = toId(item?.id);
      if (id) {
        const episode = await Episode.findByPk(id);
        if (!episode) continue;
        await episode.update({ order: index + 1, ...(title && { title }) });
        ids.push(id);
      } else if (title) {
        const episode = await Episode.create({ title, order: index + 1, universe_id: story.universe_id });
        ids.push(episode.id);
      }
    }
    await story.setEpisodes(ids);
    // Épisodes retirés : supprimés s'ils ne sont plus dans aucune histoire
    for (const id of before.filter((x) => !ids.includes(x))) {
      const episode = await Episode.findByPk(id, { include: [{ model: Story, as: "stories", attributes: ["id"] }] });
      if (episode && !episode.stories.length) {
        await episode.destroy();
        deleteUpload(episode.background);
      }
    }
  } else if (Array.isArray(body.episodeIds)) {
    await story.setEpisodes(body.episodeIds.map(toId).filter(Boolean));
  }
}

const loadStoryDetail = async (id) => {
  const story = await Story.findByPk(id, { include: detailIncludes, order: episodeOrder });
  return story ? story.toJSON() : null;
};

exports.getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.universe_id) where.universe_id = req.query.universe_id;
    res.json(await Story.findAll({ where, include: listIncludes, order: [["name", "ASC"], ...episodeOrder] }));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.getById = async (req, res) => {
  try {
    const story = await loadStoryDetail(req.params.id);
    if (!story) return res.status(404).json({ error: "Histoire non trouvée" });
    res.json(story);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.create = async (req, res) => {
  try {
    const data = pickStoryFields(req.body);
    if (!data.name) return res.status(400).json({ error: "Le nom de l'histoire est requis." });
    const story = await Story.create({ ...data, universe_id: toId(req.body.universe_id) });
    await saveEpisodes(story, req.body);
    res.status(201).json(await loadStoryDetail(story.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

exports.update = async (req, res) => {
  try {
    const story = await Story.findByPk(req.params.id);
    if (!story) return res.status(404).json({ error: "Histoire non trouvée" });
    const data = pickStoryFields(req.body);
    if ("name" in data && !data.name) return res.status(400).json({ error: "Le nom de l'histoire est requis." });
    await story.update(data);
    await saveEpisodes(story, req.body);
    res.json(await loadStoryDetail(story.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// Supprime l'histoire, ses images, et ses épisodes qui n'appartiennent à aucune autre histoire
exports.delete = async (req, res) => {
  try {
    const story = await Story.findByPk(req.params.id, { include: [{ model: Episode, as: "episodes", attributes: ["id"] }] });
    if (!story) return res.status(404).json({ error: "Histoire non trouvée" });
    const episodeIds = story.episodes.map((e) => e.id);
    await story.destroy();
    if (episodeIds.length) {
      const orphans = await Episode.findAll({
        where: { id: { [Op.in]: episodeIds } },
        include: [{ model: Story, as: "stories", attributes: ["id"] }],
      });
      const removed = orphans.filter((e) => !e.stories.length);
      await Promise.all(removed.map((e) => e.destroy()));
      removed.forEach((e) => deleteUpload(e.background));
    }
    Object.keys(IMAGE_FOLDERS).forEach((field) => deleteUpload(story[field]));
    res.json({ message: "Histoire supprimée avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

const images = imageHandlers({ Model: Story, folders: IMAGE_FOLDERS, loadDetail: loadStoryDetail, notFound: "Histoire non trouvée" });
exports.uploadImageField = images.upload;
exports.deleteImageField = images.remove;
