const { Op, fn, col } = require('sequelize');
const sequelize = require('../config/database');
const Place = require('../models/Place');
const Episode = require('../models/Episode');
const Story = require('../models/Story');
const { RpScene, RpMessage, RpMessageCharacter, RpSceneEpisode, RpRead } = require('../models/Roleplay');
const { isAdmin } = require('../services/auth');
const { broadcast } = require('../services/realtime');
const messages = require('../services/messages');

const { httpError, toId, toIds, handle: handleAs } = messages;

// Sous-dossier d'uploads des pièces jointes envoyées dans les fils (/uploads/roleplay/images|sounds)
exports.uploadAttachments = messages.attachmentsMiddleware('roleplay');

/*
 * Roleplay écrit : fil de messages par lieu, scènes, liens scène ↔ épisode.
 * Les messages eux-mêmes (écriture, modification, suppression) sont un système commun : services/messages.js.
 * Ce contrôleur y ajoute ce qui est propre au roleplay : fils des lieux, déplacements des personnages, temps réel.
 * Lecture : tout compte connecté. Écriture (filtrée par middlewares/authorize.js) : éditeurs et admins, avec :
 * - écrire au nom d'un personnage : admins, ou éditeurs liés à ce personnage ;
 * - supprimer une scène : son créateur, ou un admin.
 * Marquer un fil comme lu : tout compte connecté.
 */

const PAGE_SIZE = 50;

const handle = (label, fnc) => handleAs(`roleplay ${label}`, fnc);

// ---------------------------------------------------------------------------
// Déplacements des personnages (extension des messages)
// ---------------------------------------------------------------------------

/**
 * Personnages des messages, dans l'ordre, avec pour chacun son message précédent et suivant (tous lieux confondus,
 * hors messages hors des fils) :
 * [{ messageId, characterId, prevId, nextId }].
 */
async function speakerLinks(messageIds) {
  const [rows] = await sequelize.query(
    `SELECT mc.messageId, mc.characterId,
       (SELECT p.messageId FROM rp_message_characters p JOIN rp_messages pm ON pm.id = p.messageId AND pm.offThread = 0
         WHERE p.characterId = mc.characterId AND p.messageId < mc.messageId ORDER BY p.messageId DESC LIMIT 1) AS prevId,
       (SELECT n.messageId FROM rp_message_characters n JOIN rp_messages nm ON nm.id = n.messageId AND nm.offThread = 0
         WHERE n.characterId = mc.characterId AND n.messageId > mc.messageId ORDER BY n.messageId ASC LIMIT 1) AS nextId
       FROM rp_message_characters mc WHERE mc.messageId IN (:messageIds) ORDER BY mc.position ASC`,
    { replacements: { messageIds } },
  );
  return rows;
}

/**
 * Déplacements des personnages d'un message, d'après leur message précédent et suivant :
 * - arrivals : [{ characterId, fromPlaceId, fromMessageId }] (fromPlaceId null : toute première apparition) ;
 * - departures : [{ characterId, toPlaceId, toMessageId }] (le personnage parle ensuite dans un autre lieu).
 */
function travelsOf(message, links, placeOf) {
  const arrivals = [];
  const departures = [];
  for (const l of links) {
    const fromPlaceId = l.prevId ? placeOf.get(l.prevId) : null;
    if (!l.prevId) arrivals.push({ characterId: l.characterId, fromPlaceId: null, fromMessageId: null });
    else if (fromPlaceId && fromPlaceId !== message.placeId) arrivals.push({ characterId: l.characterId, fromPlaceId, fromMessageId: l.prevId });
    const toPlaceId = l.nextId ? placeOf.get(l.nextId) : null;
    if (toPlaceId && toPlaceId !== message.placeId) departures.push({ characterId: l.characterId, toPlaceId, toMessageId: l.nextId });
  }
  return { arrivals, departures };
}

/** Ajoute leurs déplacements aux messages des fils (les autres, scène hors roleplay ou récit d'épisode, n'en ont pas). */
async function addTravels(rows, json) {
  const inThreads = rows.filter((m) => m.placeId && !m.offThread);
  if (!inThreads.length) return;
  const links = await speakerLinks(inThreads.map((m) => m.id));
  const neighbourIds = [...new Set(links.flatMap((l) => [l.prevId, l.nextId]).filter(Boolean))];
  const neighbours = neighbourIds.length ? await RpMessage.findAll({ where: { id: neighbourIds }, attributes: ['id', 'placeId'], raw: true }) : [];
  const placeOf = new Map(neighbours.map((n) => [n.id, n.placeId]));
  rows.forEach((m, i) => {
    if (m.placeId && !m.offThread) json[i].travels = travelsOf(m, links.filter((l) => l.messageId === m.id), placeOf);
  });
}

/**
 * Messages voisins (précédent et suivant de chaque personnage, tous lieux) d'un message créé, modifié ou supprimé :
 * leurs arrivées / départs changent, ils sont renvoyés aux fils concernés. `skip` : messages déjà diffusés.
 */
async function refreshNeighbours(around, skip = []) {
  const ids = new Set();
  for (const { messageId, characterIds } of around) {
    for (const characterId of characterIds) {
      const neighbour = (op, order) =>
        RpMessageCharacter.findOne({
          where: { characterId, messageId: { [op]: messageId } },
          include: [{ model: RpMessage, attributes: [], where: { offThread: false } }],
          order: [['messageId', order]],
          raw: true,
        });
      const [prev, next] = await Promise.all([neighbour(Op.lt, 'DESC'), neighbour(Op.gt, 'ASC')]);
      for (const link of [prev, next]) if (link && !skip.includes(link.messageId)) ids.add(link.messageId);
    }
  }
  for (const id of ids) {
    const message = await messages.loadMessage(id);
    if (message?.placeId) broadcast(message.placeId, { type: 'message:updated', message });
  }
}

const logRefresh = (err) => console.error('Erreur roleplay refreshNeighbours:', err);

// Messages des fils modifiés / supprimés par les routes communes (/api/messages/:id) : temps réel et déplacements
messages.extendMessages({
  serialize: addTravels,
  updated: (message, { previousCharacterIds }) => {
    if (!message.placeId || message.offThread) return;
    broadcast(message.placeId, { type: 'message:updated', message });
    // Personnages changés : les déplacements de leurs messages voisins aussi
    const changed = [
      ...message.characterIds.filter((id) => id > 0 && !previousCharacterIds.includes(id)),
      ...previousCharacterIds.filter((id) => !message.characterIds.includes(id)),
    ];
    if (changed.length) refreshNeighbours([{ messageId: message.id, characterIds: changed }], [message.id]).catch(logRefresh);
  },
  deleted: (row, { characterIds }) => {
    if (!row.placeId || row.offThread) return;
    broadcast(row.placeId, { type: 'message:deleted', messageId: row.id, sceneId: row.sceneId });
    // Le personnage passe désormais directement du message précédent au suivant
    refreshNeighbours([{ messageId: row.id, characterIds }]).catch(logRefresh);
  },
});

// ---------------------------------------------------------------------------
// Messages des fils
// ---------------------------------------------------------------------------

const findPlace = async (placeId) => {
  const place = await Place.findByPk(toId(placeId), { attributes: ['id', 'universe_id'] });
  if (!place) throw httpError(404, 'Lieu non trouvé');
  return place;
};

/**
 * Fond et ambiance en vigueur juste avant un message : dernières commandes /fond… et /ambiance… plus anciennes
 * (point de départ du fil chargé, quand ces commandes sont dans des pages pas encore chargées).
 */
async function effectsBefore(placeId, messageId) {
  if (!messageId) return { background: null, ambience: null };
  const last = (prefix) =>
    RpMessage.findOne({
      where: { placeId, offThread: false, id: { [Op.lt]: messageId }, effect: { [Op.like]: `${prefix}%` } },
      attributes: ['id', 'effect', 'imagePath', 'soundPath'],
      order: [['id', 'DESC']],
      raw: true,
    });
  const [background, ambience] = await Promise.all([last('background'), last('ambience')]);
  return { background, ambience };
}

/** Fil d'un lieu, du plus ancien au plus récent : ?before=<id> pour remonter. */
exports.listMessages = handle('listMessages', async (req, res) => {
  const place = await findPlace(req.params.placeId);
  const before = toId(req.query.before);
  const limit = Math.min(Number(req.query.limit) || PAGE_SIZE, 200);

  const where = { placeId: place.id, offThread: false, ...(before && { id: { [Op.lt]: before } }) };
  const rows = await RpMessage.findAll({ where, include: [messages.authorInclude], order: [['id', 'DESC']], limit: limit + 1 });
  const hasMore = rows.length > limit;
  const page = rows.slice(0, limit).reverse();
  res.json({ messages: await messages.serializeMessages(page), hasMore, effectsBefore: await effectsBefore(place.id, page[0]?.id) });
});

/** Nouveaux messages dans le fil d'un lieu (format : services/messages.js, createMessages). */
exports.createMessages = handle('createMessages', async (req, res) => {
  const created = await messages.createMessages(req, async () => {
    const place = await findPlace(req.params.placeId);
    return { universeId: place.universe_id, values: { placeId: place.id } };
  });
  for (const message of created) broadcast(message.placeId, { type: 'message:created', message });
  res.status(201).json(created);
  // Message précédent de chaque personnage (souvent dans un autre lieu) : « est parti vers… »
  // (personnages de l'univers seulement : les inconnus, id négatif, ne se déplacent pas)
  refreshNeighbours(created.map((m) => ({ messageId: m.id, characterIds: m.characterIds.filter((id) => id > 0) })), created.map((m) => m.id)).catch(logRefresh);
});

/** Nouveaux messages écrits dans une scène hors roleplay (même format) : hors des fils, rien d'autre à mettre à jour. */
exports.createSceneMessages = handle('createSceneMessages', async (req, res) => {
  const created = await messages.createMessages(req, async () => {
    const scene = await RpScene.findByPk(toId(req.params.id));
    if (!scene) throw httpError(404, 'Scène non trouvée');
    if (!scene.standalone) throw httpError(400, 'Les messages de cette scène s’écrivent dans le fil de son lieu.');
    return { universeId: scene.universe_id, values: { placeId: scene.placeId, sceneId: scene.id, offThread: true } };
  });
  res.status(201).json(created);
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
    where: { universe_id: universeId, offThread: false },
    group: ['placeId'],
    raw: true,
  });
  const [speakers] = await sequelize.query(
    `SELECT m.placeId, mc.characterId, MAX(m.id) AS lastMessage
       FROM rp_messages m JOIN rp_message_characters mc ON mc.messageId = m.id
      WHERE m.universe_id = :universeId AND m.offThread = 0 GROUP BY m.placeId, mc.characterId ORDER BY lastMessage DESC`,
    { replacements: { universeId } },
  );
  const [unread] = await sequelize.query(
    `SELECT m.placeId, COUNT(*) AS unread
       FROM rp_messages m LEFT JOIN rp_reads r ON r.placeId = m.placeId AND r.userId = :userId
      WHERE m.universe_id = :universeId AND m.offThread = 0 AND m.id > COALESCE(r.lastMessageId, 0) AND (m.userId IS NULL OR m.userId <> :userId)
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

/**
 * Sons joués dans les scènes de l'univers (page « Sons » du module Son), du plus ancien au plus récent :
 * ambiances (/ambiance avec un son joint) et sons joints aux messages.
 */
exports.sceneSounds = handle('sceneSounds', async (req, res) => {
  const universeId = toId(req.query.universe_id);
  if (!universeId) throw httpError(400, 'Paramètre universe_id requis');
  const messages = await RpMessage.findAll({
    where: { universe_id: universeId, sceneId: { [Op.ne]: null }, soundPath: { [Op.ne]: null } },
    attributes: ['id', 'sceneId', 'soundPath', 'effect', 'createdAt'],
    order: [['id', 'ASC']],
    raw: true,
  });
  res.json(messages.map((m) => ({
    id: m.id,
    sceneId: m.sceneId,
    soundPath: m.soundPath,
    kind: m.effect?.startsWith('ambience') ? 'ambience' : 'sound',
    createdAt: m.createdAt,
  })));
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

/** Une scène et tous ses messages (lecture), avec le fond et l'ambiance en vigueur à son début. */
exports.getScene = handle('getScene', async (req, res) => {
  const scene = await RpScene.findByPk(toId(req.params.id));
  if (!scene) throw httpError(404, 'Scène non trouvée');
  const list = await messages.listMessages({ sceneId: scene.id });
  const [serialized] = await serializeScenes([scene]);
  // Fond / ambiance en vigueur au début de la scène (vue « visual novel »)
  const before = scene.standalone ? { background: null, ambience: null } : await effectsBefore(scene.placeId, list[0]?.id);
  res.json({ ...serialized, messages: list, effectsBefore: before });
});

/** Comparateur de scènes (ids) dans l'ordre chronologique : premier message, puis id (scènes vides à la fin). */
async function chronological(sceneIds) {
  const rows = sceneIds.length
    ? await RpMessage.findAll({ attributes: ['sceneId', [fn('MIN', col('id')), 'first']], where: { sceneId: sceneIds }, group: ['sceneId'], raw: true })
    : [];
  const first = new Map(rows.map((r) => [r.sceneId, Number(r.first)]));
  return (a, b) => (first.get(a) ?? Infinity) - (first.get(b) ?? Infinity) || a - b;
}

/** Scènes d'une histoire dans l'ordre de lecture : [{ sceneId, episode: { id, title } }] (une scène n'y est qu'une fois). */
async function storyReadingOrder(story) {
  const episodes = [...story.episodes].sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || a.id - b.id);
  const links = episodes.length ? await RpSceneEpisode.findAll({ where: { episodeId: episodes.map((e) => e.id) }, raw: true }) : [];
  const compare = await chronological([...new Set(links.map((l) => l.sceneId))]);
  const seen = new Set();
  const list = [];
  for (const episode of episodes) {
    const ids = links.filter((l) => l.episodeId === episode.id).map((l) => l.sceneId).sort(compare);
    for (const sceneId of ids) {
      if (seen.has(sceneId)) continue;
      seen.add(sceneId);
      list.push({ sceneId, episode: { id: episode.id, title: episode.title } });
    }
  }
  return list;
}

/**
 * Scènes précédente et suivante (?story=<id> : dans l'ordre de cette histoire, si la scène en fait partie ;
 * sinon dans l'ordre chronologique des scènes de l'univers) :
 * { story: { id, name } | null, position, total, previous, next } (previous / next : { id, title, placeId, episode? } ou null).
 */
exports.sceneNeighbours = handle('sceneNeighbours', async (req, res) => {
  const scene = await RpScene.findByPk(toId(req.params.id), { attributes: ['id', 'universe_id'] });
  if (!scene) throw httpError(404, 'Scène non trouvée');

  let list = null;
  let story = null;
  const storyId = toId(req.query.story);
  if (storyId) {
    const found = await Story.findByPk(storyId, {
      attributes: ['id', 'name', 'universe_id'],
      include: [{ model: Episode, as: 'episodes', attributes: ['id', 'title', 'order'], through: { attributes: [] } }],
    });
    if (found && found.universe_id === scene.universe_id) {
      const order = await storyReadingOrder(found);
      if (order.some((s) => s.sceneId === scene.id)) {
        list = order;
        story = { id: found.id, name: found.name };
      }
    }
  }
  if (!list) {
    const ids = (await RpScene.findAll({ where: { universe_id: scene.universe_id }, attributes: ['id'], raw: true })).map((s) => s.id);
    const compare = await chronological(ids);
    list = ids.sort(compare).map((sceneId) => ({ sceneId }));
  }

  const i = list.findIndex((s) => s.sceneId === scene.id);
  const around = [list[i - 1], list[i + 1]];
  const rows = await RpScene.findAll({ where: { id: around.filter(Boolean).map((s) => s.sceneId) }, attributes: ['id', 'title', 'placeId'], raw: true });
  const describe = (entry) => {
    const row = entry && rows.find((r) => r.id === entry.sceneId);
    return row ? { ...row, episode: entry.episode || null } : null;
  };
  res.json({ story, position: i + 1, total: list.length, previous: describe(around[0]), next: describe(around[1]) });
});

/** Rattache des messages (du fil du même lieu) à une scène. `silent` : ce n'est pas une modification du message. */
const assignMessages = (placeId, messageIds, sceneId, transaction) =>
  messageIds.length ? RpMessage.update({ sceneId }, { where: { id: messageIds, placeId, offThread: false }, transaction, silent: true }) : null;

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

/** { placeId, title, description?, standalone?, messageIds?, episodeIds? } (scène hors roleplay : pas de messageIds, elle s'écrit ensuite) */
exports.createScene = handle('createScene', async (req, res) => {
  const place = await findPlace(req.body?.placeId);
  const title = cleanTitle(req.body?.title);
  const id = await sequelize.transaction(async (transaction) => {
    const scene = await RpScene.create(
      {
        placeId: place.id, universe_id: place.universe_id, title, description: req.body?.description?.trim() || null,
        standalone: req.body?.standalone === true, createdBy: req.user.id,
      },
      { transaction },
    );
    if (!scene.standalone) await assignMessages(place.id, toIds(req.body?.messageIds), scene.id, transaction);
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
  if (scene.standalone && (toIds(body.addMessageIds).length || toIds(body.removeMessageIds).length)) {
    throw httpError(400, 'Une scène hors roleplay s’écrit directement : ses messages ne viennent pas des fils.');
  }
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
  // Scène hors roleplay : ses messages n'existent que par elle
  if (scene.standalone) await messages.destroyMessages({ sceneId: id, offThread: true });
  await scene.destroy(); // scène du roleplay : les messages restent dans le fil (sceneId → NULL)
  broadcast(placeId, { type: 'scenes:changed' });
  res.json({ id });
});
