const { Op, fn, col } = require('sequelize');
const sequelize = require('../config/database');
const Place = require('../models/Place');
const Character = require('../models/Character');
const Episode = require('../models/Episode');
const User = require('../models/User');
const { RpScene, RpMessage, RpMessageCharacter, RpSceneEpisode, RpRead, isHrpContent } = require('../models/Roleplay');
const { isAdmin, canEditEntity } = require('../services/auth');
const { broadcast } = require('../services/realtime');
const { deleteUpload } = require('../services/universeTransfer');

// Sous-dossier d'uploads des images envoyées dans les fils (voir routes/roleplayRoutes.js)
const IMAGE_FOLDER = 'roleplay/images';
exports.IMAGE_FOLDER = IMAGE_FOLDER;

/*
 * Roleplay écrit : fil de messages par lieu, scènes, liens scène ↔ épisode.
 * Lecture : tout compte connecté. Écriture (filtrée par middlewares/authorize.js) : éditeurs et admins, avec :
 * - écrire au nom d'un personnage : admins, ou éditeurs liés à ce personnage ;
 * - modifier / supprimer un message : son auteur, ou un admin ;
 * - supprimer une scène : son créateur, ou un admin.
 * Marquer un fil comme lu : tout compte connecté.
 */

const MAX_CONTENT = 20000;
const PAGE_SIZE = 50;

const httpError = (status, message) => Object.assign(new Error(message), { status });
const toId = (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);
const toIds = (v) => (Array.isArray(v) ? [...new Set(v.map(toId).filter(Boolean))] : []);

const handle = (label, fnc) => async (req, res) => {
  try {
    await fnc(req, res);
  } catch (error) {
    if (!error.status) console.error(`Erreur roleplay ${label}:`, error);
    res.status(error.status || 500).json({ error: error.message });
  }
};

// ---------------------------------------------------------------------------
// Mise en forme des réponses
// ---------------------------------------------------------------------------

const authorAttributes = ['id', 'displayName'];

/** Messages (instances avec `author`) → JSON, avec les ids des personnages dans l'ordre. */
async function serializeMessages(messages) {
  if (!messages.length) return [];
  const links = await RpMessageCharacter.findAll({
    where: { messageId: messages.map((m) => m.id) },
    order: [['position', 'ASC']],
    raw: true,
  });
  const speakers = new Map();
  for (const l of links) {
    if (!speakers.has(l.messageId)) speakers.set(l.messageId, []);
    speakers.get(l.messageId).push(l.characterId);
  }
  return messages.map((m) => ({
    id: m.id,
    placeId: m.placeId,
    sceneId: m.sceneId,
    content: m.content,
    imagePath: m.imagePath,
    isHrp: m.isHrp,
    author: m.author ? { id: m.author.id, displayName: m.author.displayName } : null,
    characterIds: speakers.get(m.id) || [],
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }));
}

const loadMessage = async (id) => {
  const message = await RpMessage.findByPk(id, { include: [{ model: User, as: 'author', attributes: authorAttributes }] });
  return message ? (await serializeMessages([message]))[0] : null;
};

/** Scènes → JSON avec nombre de messages, dates, personnages et épisodes liés. */
async function serializeScenes(scenes) {
  if (!scenes.length) return [];
  const ids = scenes.map((s) => s.id);
  const stats = await RpMessage.findAll({
    attributes: ['sceneId', [fn('COUNT', col('id')), 'count'], [fn('MIN', col('createdAt')), 'firstAt'], [fn('MAX', col('createdAt')), 'lastAt']],
    where: { sceneId: ids },
    group: ['sceneId'],
    raw: true,
  });
  const [speakerRows] = await sequelize.query(
    'SELECT DISTINCT m.sceneId, mc.characterId FROM rp_messages m JOIN rp_message_characters mc ON mc.messageId = m.id WHERE m.sceneId IN (:ids)',
    { replacements: { ids } },
  );
  const episodes = await RpSceneEpisode.findAll({ where: { sceneId: ids }, raw: true });
  return scenes.map((s) => {
    const stat = stats.find((r) => r.sceneId === s.id);
    return {
      id: s.id,
      placeId: s.placeId,
      title: s.title,
      description: s.description,
      createdBy: s.createdBy,
      messageCount: Number(stat?.count || 0),
      firstAt: stat?.firstAt || null,
      lastAt: stat?.lastAt || null,
      characterIds: speakerRows.filter((r) => r.sceneId === s.id).map((r) => r.characterId),
      episodeIds: episodes.filter((e) => e.sceneId === s.id).map((e) => e.episodeId),
    };
  });
}

const findPlace = async (placeId) => {
  const place = await Place.findByPk(toId(placeId), { attributes: ['id', 'universe_id'] });
  if (!place) throw httpError(404, 'Lieu non trouvé');
  return place;
};

/** Vérifie que l'utilisateur peut écrire au nom de ces personnages (et qu'ils sont de l'univers du lieu). */
async function checkSpeakers(user, place, characterIds) {
  if (!characterIds.length) return;
  const characters = await Character.findAll({ where: { id: characterIds, universe_id: place.universe_id }, attributes: ['id'] });
  if (characters.length !== characterIds.length) throw httpError(400, 'Personnage inconnu dans cet univers.');
  for (const id of characterIds) {
    if (!(await canEditEntity(user, 'character', id))) {
      throw httpError(403, 'Vous ne pouvez écrire qu’au nom des personnages qui vous sont liés.');
    }
  }
}

/** Texte d'un message ; `allowEmpty` : message accompagné d'une image. */
const cleanContent = (content, { allowEmpty = false } = {}) => {
  const text = typeof content === 'string' ? content.replace(/\r\n/g, '\n').trim() : '';
  if (!text && !allowEmpty) throw httpError(400, 'Le message est vide.');
  if (text.length > MAX_CONTENT) throw httpError(400, `Message trop long (${MAX_CONTENT} caractères maximum).`);
  return text;
};

const setSpeakers = (messageId, characterIds, transaction) =>
  RpMessageCharacter.destroy({ where: { messageId }, transaction }).then(() =>
    characterIds.length
      ? RpMessageCharacter.bulkCreate(characterIds.map((characterId, position) => ({ messageId, characterId, position })), { transaction })
      : null,
  );

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

/** Fil d'un lieu, du plus ancien au plus récent : ?before=<id> pour remonter. */
exports.listMessages = handle('listMessages', async (req, res) => {
  const place = await findPlace(req.params.placeId);
  const before = toId(req.query.before);
  const limit = Math.min(Number(req.query.limit) || PAGE_SIZE, 200);

  const where = { placeId: place.id, ...(before && { id: { [Op.lt]: before } }) };
  const rows = await RpMessage.findAll({
    where,
    include: [{ model: User, as: 'author', attributes: authorAttributes }],
    order: [['id', 'DESC']],
    limit: limit + 1,
  });
  const hasMore = rows.length > limit;
  res.json({ messages: await serializeMessages(rows.slice(0, limit).reverse()), hasMore });
});

const MAX_PARTS = 20;

/**
 * Nouveaux messages, envoyés d'un coup dans l'ordre (saisie avec /personnage ; un seul message = une partie) :
 * { parts: [{ content, characterIds }] } en JSON, ou en multipart (`parts` en JSON, `image` jointe au dernier).
 * Tout ou rien : un message refusé annule les autres.
 */
exports.createMessages = handle('createMessages', async (req, res) => {
  const imagePath = req.file ? `/uploads/${IMAGE_FOLDER}/${req.file.filename}` : null;
  try {
    const place = await findPlace(req.params.placeId);
    let parts = req.body?.parts;
    if (typeof parts === 'string') {
      try {
        parts = JSON.parse(parts);
      } catch {
        parts = null;
      }
    }
    if (!Array.isArray(parts) || !parts.length) throw httpError(400, 'Aucun message à envoyer.');
    if (parts.length > MAX_PARTS) throw httpError(400, `${MAX_PARTS} messages maximum à la fois.`);

    const cleaned = [];
    for (const [i, part] of parts.entries()) {
      const withImage = Boolean(imagePath) && i === parts.length - 1;
      const characterIds = toIds(part?.characterIds);
      await checkSpeakers(req.user, place, characterIds);
      const content = cleanContent(part?.content, { allowEmpty: withImage });
      cleaned.push({ content, characterIds, imagePath: withImage ? imagePath : null });
    }

    const ids = await sequelize.transaction(async (transaction) => {
      const created = [];
      for (const { content, characterIds, imagePath: image } of cleaned) {
        const message = await RpMessage.create(
          { placeId: place.id, universe_id: place.universe_id, userId: req.user.id, content, imagePath: image, isHrp: !image && isHrpContent(content) },
          { transaction },
        );
        await setSpeakers(message.id, characterIds, transaction);
        created.push(message.id);
      }
      return created;
    });
    const messages = [];
    for (const id of ids) {
      const message = await loadMessage(id);
      messages.push(message);
      broadcast(place.id, { type: 'message:created', message });
    }
    res.status(201).json(messages);
  } catch (error) {
    if (imagePath) deleteUpload(imagePath);
    throw error;
  }
});

const findOwnMessage = async (req) => {
  const message = await RpMessage.findByPk(toId(req.params.id));
  if (!message) throw httpError(404, 'Message non trouvé');
  if (!isAdmin(req.user) && message.userId !== req.user.id) throw httpError(403, 'Seul l’auteur du message peut le modifier.');
  return message;
};

exports.updateMessage = handle('updateMessage', async (req, res) => {
  const message = await findOwnMessage(req);
  const place = await findPlace(message.placeId);
  const content = req.body?.content !== undefined ? cleanContent(req.body.content, { allowEmpty: Boolean(message.imagePath) }) : message.content;
  const characterIds = req.body?.characterIds !== undefined ? toIds(req.body.characterIds) : null;

  if (characterIds) {
    // Personnages déjà présents : conservés même si l'auteur n'est plus lié à eux
    const current = (await RpMessageCharacter.findAll({ where: { messageId: message.id }, raw: true })).map((l) => l.characterId);
    await checkSpeakers(req.user, place, characterIds.filter((id) => !current.includes(id)));
  }
  await sequelize.transaction(async (transaction) => {
    await message.update({ content, isHrp: !message.imagePath && isHrpContent(content) }, { transaction });
    if (characterIds) await setSpeakers(message.id, characterIds, transaction);
  });
  const updated = await loadMessage(message.id);
  broadcast(message.placeId, { type: 'message:updated', message: updated });
  res.json(updated);
});

exports.deleteMessage = handle('deleteMessage', async (req, res) => {
  const message = await findOwnMessage(req);
  const { id, placeId, sceneId, imagePath } = message;
  await message.destroy();
  if (imagePath) deleteUpload(imagePath);
  broadcast(placeId, { type: 'message:deleted', messageId: id, sceneId });
  res.json({ id });
});

/** Marque le fil d'un lieu comme lu jusqu'à { messageId } (jamais en arrière). */
exports.markRead = handle('markRead', async (req, res) => {
  const place = await findPlace(req.params.placeId);
  const messageId = toId(req.body?.messageId);
  if (!messageId) throw httpError(400, 'messageId requis');
  const [read] = await RpRead.findOrCreate({ where: { userId: req.user.id, placeId: place.id }, defaults: { lastMessageId: messageId } });
  if (read.lastMessageId < messageId) await read.update({ lastMessageId: messageId });
  res.json({ placeId: place.id, lastMessageId: Math.max(read.lastMessageId, messageId) });
});

// ---------------------------------------------------------------------------
// Vue d'ensemble (page Roleplay, fiches)
// ---------------------------------------------------------------------------

/**
 * Activité d'un univers : lieux avec des messages (personnages du plus récent au plus ancien, nombre de messages
 * non lus par le compte connecté, hors ses propres messages), et toutes les scènes.
 */
exports.overview = handle('overview', async (req, res) => {
  const universeId = toId(req.query.universe_id);
  if (!universeId) throw httpError(400, 'Paramètre universe_id requis');
  const places = await RpMessage.findAll({
    attributes: ['placeId', [fn('COUNT', col('id')), 'count'], [fn('MAX', col('createdAt')), 'lastAt']],
    where: { universe_id: universeId },
    group: ['placeId'],
    raw: true,
  });
  const [speakers] = await sequelize.query(
    `SELECT m.placeId, mc.characterId, MAX(m.id) AS lastMessage
       FROM rp_messages m JOIN rp_message_characters mc ON mc.messageId = m.id
      WHERE m.universe_id = :universeId GROUP BY m.placeId, mc.characterId ORDER BY lastMessage DESC`,
    { replacements: { universeId } },
  );
  const [unread] = await sequelize.query(
    `SELECT m.placeId, COUNT(*) AS unread
       FROM rp_messages m LEFT JOIN rp_reads r ON r.placeId = m.placeId AND r.userId = :userId
      WHERE m.universe_id = :universeId AND m.id > COALESCE(r.lastMessageId, 0) AND (m.userId IS NULL OR m.userId <> :userId)
      GROUP BY m.placeId`,
    { replacements: { universeId, userId: req.user.id } },
  );
  const scenes = await RpScene.findAll({ where: { universe_id: universeId }, order: [['id', 'DESC']] });
  res.json({
    places: places.map((p) => ({
      placeId: p.placeId,
      count: Number(p.count),
      unread: Number(unread.find((u) => u.placeId === p.placeId)?.unread || 0),
      lastAt: p.lastAt,
      characterIds: speakers.filter((s) => s.placeId === p.placeId).map((s) => s.characterId),
    })),
    scenes: await serializeScenes(scenes),
  });
});

/** Roleplay d'un personnage : scènes où il apparaît. */
exports.characterActivity = handle('characterActivity', async (req, res) => {
  const characterId = toId(req.params.characterId);
  const [sceneRows] = await sequelize.query(
    `SELECT DISTINCT m.sceneId FROM rp_messages m JOIN rp_message_characters mc ON mc.messageId = m.id
      WHERE mc.characterId = :characterId AND m.sceneId IS NOT NULL`,
    { replacements: { characterId } },
  );
  const scenes = sceneRows.length ? await RpScene.findAll({ where: { id: sceneRows.map((r) => r.sceneId) }, order: [['id', 'DESC']] }) : [];
  res.json({ scenes: await serializeScenes(scenes) });
});

/** Scènes rattachées à un épisode. */
exports.episodeScenes = handle('episodeScenes', async (req, res) => {
  const links = await RpSceneEpisode.findAll({ where: { episodeId: toId(req.params.episodeId) }, raw: true });
  const scenes = links.length ? await RpScene.findAll({ where: { id: links.map((l) => l.sceneId) }, order: [['id', 'ASC']] }) : [];
  res.json(await serializeScenes(scenes));
});

/** Remplace les scènes rattachées à un épisode : { sceneIds } (scènes de l'univers de l'épisode uniquement). */
exports.setEpisodeScenes = handle('setEpisodeScenes', async (req, res) => {
  const episode = await Episode.findByPk(toId(req.params.episodeId), { attributes: ['id', 'universe_id'] });
  if (!episode) throw httpError(404, 'Épisode non trouvé');
  const wanted = toIds(req.body?.sceneIds);
  const scenes = wanted.length
    ? await RpScene.findAll({ where: { id: wanted, universe_id: episode.universe_id }, attributes: ['id'] })
    : [];
  await sequelize.transaction(async (transaction) => {
    await RpSceneEpisode.destroy({ where: { episodeId: episode.id }, transaction });
    if (scenes.length) await RpSceneEpisode.bulkCreate(scenes.map((s) => ({ sceneId: s.id, episodeId: episode.id })), { transaction });
  });
  const linked = scenes.length ? await RpScene.findAll({ where: { id: scenes.map((s) => s.id) }, order: [['id', 'ASC']] }) : [];
  res.json(await serializeScenes(linked));
});

// ---------------------------------------------------------------------------
// Scènes
// ---------------------------------------------------------------------------

/** Une scène et tous ses messages (lecture). */
exports.getScene = handle('getScene', async (req, res) => {
  const scene = await RpScene.findByPk(toId(req.params.id));
  if (!scene) throw httpError(404, 'Scène non trouvée');
  const messages = await RpMessage.findAll({
    where: { sceneId: scene.id },
    include: [{ model: User, as: 'author', attributes: authorAttributes }],
    order: [['id', 'ASC']],
  });
  const [serialized] = await serializeScenes([scene]);
  res.json({ ...serialized, messages: await serializeMessages(messages) });
});

/** Rattache des messages (du même lieu) à une scène. `silent` : ce n'est pas une modification du message. */
const assignMessages = (placeId, messageIds, sceneId, transaction) =>
  messageIds.length ? RpMessage.update({ sceneId }, { where: { id: messageIds, placeId }, transaction, silent: true }) : null;

/** Épisodes d'une scène (épisodes de l'univers du lieu uniquement). */
async function setEpisodes(scene, episodeIds, transaction) {
  const episodes = episodeIds.length
    ? await Episode.findAll({ where: { id: episodeIds, universe_id: scene.universe_id }, attributes: ['id'], transaction })
    : [];
  await RpSceneEpisode.destroy({ where: { sceneId: scene.id }, transaction });
  if (episodes.length) await RpSceneEpisode.bulkCreate(episodes.map((e) => ({ sceneId: scene.id, episodeId: e.id })), { transaction });
}

const cleanTitle = (title) => {
  const text = typeof title === 'string' ? title.trim().slice(0, 255) : '';
  if (!text) throw httpError(400, 'Le titre de la scène est requis.');
  return text;
};

/** { placeId, title, description?, messageIds?, episodeIds? } */
exports.createScene = handle('createScene', async (req, res) => {
  const place = await findPlace(req.body?.placeId);
  const title = cleanTitle(req.body?.title);
  const id = await sequelize.transaction(async (transaction) => {
    const scene = await RpScene.create(
      { placeId: place.id, universe_id: place.universe_id, title, description: req.body?.description?.trim() || null, createdBy: req.user.id },
      { transaction },
    );
    await assignMessages(place.id, toIds(req.body?.messageIds), scene.id, transaction);
    if (req.body?.episodeIds) await setEpisodes(scene, toIds(req.body.episodeIds), transaction);
    return scene.id;
  });
  broadcast(place.id, { type: 'scenes:changed' });
  const [scene] = await serializeScenes([await RpScene.findByPk(id)]);
  res.status(201).json(scene);
});

/** { title?, description?, episodeIds?, addMessageIds?, removeMessageIds? } */
exports.updateScene = handle('updateScene', async (req, res) => {
  const scene = await RpScene.findByPk(toId(req.params.id));
  if (!scene) throw httpError(404, 'Scène non trouvée');
  const body = req.body || {};
  await sequelize.transaction(async (transaction) => {
    const data = {};
    if (body.title !== undefined) data.title = cleanTitle(body.title);
    if (body.description !== undefined) data.description = body.description?.trim() || null;
    if (Object.keys(data).length) await scene.update(data, { transaction });
    if (body.episodeIds !== undefined) await setEpisodes(scene, toIds(body.episodeIds), transaction);
    await assignMessages(scene.placeId, toIds(body.addMessageIds), scene.id, transaction);
    const removed = toIds(body.removeMessageIds);
    if (removed.length) await RpMessage.update({ sceneId: null }, { where: { id: removed, sceneId: scene.id }, transaction, silent: true });
  });
  broadcast(scene.placeId, { type: 'scenes:changed' });
  const [serialized] = await serializeScenes([await RpScene.findByPk(scene.id)]);
  res.json(serialized);
});

exports.deleteScene = handle('deleteScene', async (req, res) => {
  const scene = await RpScene.findByPk(toId(req.params.id));
  if (!scene) throw httpError(404, 'Scène non trouvée');
  if (!isAdmin(req.user) && scene.createdBy !== req.user.id) throw httpError(403, 'Seul le créateur de la scène peut la supprimer.');
  const { id, placeId } = scene;
  await scene.destroy(); // les messages restent dans le fil (sceneId → NULL)
  broadcast(placeId, { type: 'scenes:changed' });
  res.json({ id });
});
