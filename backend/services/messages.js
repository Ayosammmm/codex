const path = require('path');
const { Op, literal } = require('sequelize');
const sequelize = require('../config/database');
const Character = require('../models/Character');
const Episode = require('../models/Episode');
const Story = require('../models/Story');
const User = require('../models/User');
const { Message, MessageCharacter, isHrpContent } = require('../models/Message');
const { isAdmin, canEditEntity } = require('./auth');
const { deleteUpload } = require('./universeTransfer');
const { runCommand } = require('./rpCommands');
const { MAX_IMAGE_SIZE, createAttachmentsMiddleware } = require('../middlewares/upload');

/*
 * Messages : système commun du roleplay (fils des lieux, scènes) et des récits d'épisodes (models/Message.js).
 * Ce service fait tout ce qui ne dépend pas de l'endroit où le message est écrit :
 * - validation du texte, commandes (/d20, /fond…), pièces jointes (image, son) ;
 * - personnages au nom desquels on écrit ;
 * - mise en forme des réponses, modification et suppression d'un message (routes /api/messages/:id).
 * Ce qui est propre à un usage (déplacements et temps réel du roleplay…) s'y branche avec `extendMessages`.
 */

const UPLOADS_ROOT = path.join(__dirname, '..', 'uploads');
const MAX_CONTENT = 20000;
const MAX_PARTS = 20;

const httpError = (status, message) => Object.assign(new Error(message), { status });
const toId = (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);
const toIds = (v) => (Array.isArray(v) ? [...new Set(v.map(toId).filter(Boolean))] : []);

// Personnages inconnus (« /??? ») : ids négatifs -1 à -UNKNOWN_COUNT dans `characterIds` (frontend : unknownSpeakers.js)
const UNKNOWN_COUNT = 5;

/**
 * `characterIds` reçus → { characterIds (personnages de l'univers), unknown ([{ slot, position }] ou null), positions }.
 * `positions` : place de chaque personnage de l'univers dans la liste complète (ordre d'affichage).
 */
function parseSpeakers(value) {
  const ids = Array.isArray(value) ? [...new Set(value.map(Number).filter((n) => Number.isInteger(n) && n !== 0))] : [];
  const characterIds = [];
  const positions = [];
  const unknown = [];
  ids.forEach((id, position) => {
    if (id > 0) {
      characterIds.push(id);
      positions.push(position);
    } else if (-id <= UNKNOWN_COUNT) unknown.push({ slot: -id, position });
  });
  return { characterIds, positions, unknown: unknown.length ? unknown : null };
}

/** Contrôleur Express : erreurs `httpError` renvoyées telles quelles, les autres journalisées. */
const handle = (label, fnc) => async (req, res) => {
  try {
    await fnc(req, res);
  } catch (error) {
    if (!error.status) console.error(`Erreur ${label}:`, error);
    res.status(error.status || 500).json({ error: error.message });
  }
};

/** Pièces jointes d'un envoi (une image de 5 Mo et/ou un son), rangées dans /uploads/<folder>/images|sounds. */
const attachmentsMiddleware = (folder) => createAttachmentsMiddleware({ imageFolder: `${folder}/images`, soundFolder: `${folder}/sounds` });

// ---------------------------------------------------------------------------
// Extensions (roleplay…)
// ---------------------------------------------------------------------------

/*
 * - serialize(rows, json) : complète les messages mis en forme (`json[i]` correspond à `rows[i]`) ;
 * - updated(message, { previousCharacterIds }) : après une modification (message : JSON) ;
 * - deleted(row, { characterIds }) : après une suppression (row : l'enregistrement supprimé).
 */
const extensions = [];
const extendMessages = (extension) => extensions.push(extension);
const runHook = (name, ...args) => {
  for (const ext of extensions) {
    if (!ext[name]) continue;
    Promise.resolve()
      .then(() => ext[name](...args))
      .catch((err) => console.error(`Erreur messages (${name}):`, err));
  }
};

// ---------------------------------------------------------------------------
// Mise en forme
// ---------------------------------------------------------------------------

const authorInclude = { model: User, as: 'author', attributes: ['id', 'displayName'] };

/** Messages (instances avec `author`) → JSON, avec les ids des personnages dans l'ordre. */
async function serializeMessages(rows) {
  if (!rows.length) return [];
  const links = await MessageCharacter.findAll({ where: { messageId: rows.map((m) => m.id) }, order: [['position', 'ASC']], raw: true });
  const json = rows.map((m) => ({
    id: m.id,
    placeId: m.placeId,
    sceneId: m.sceneId,
    episodeId: m.episodeId,
    offThread: m.offThread,
    // Ordre de lecture (insertion entre deux messages, sinon ordre d'écriture)
    sortKey: m.sortKey ?? m.id,
    content: m.content,
    imagePath: m.imagePath,
    soundPath: m.soundPath,
    roll: m.roll || null,
    effect: m.effect || null,
    isHrp: m.isHrp,
    author: m.author ? { id: m.author.id, displayName: m.author.displayName } : null,
    // Personnages de l'univers et inconnus (id négatif), dans l'ordre
    characterIds: [
      ...links.filter((l) => l.messageId === m.id).map((l) => ({ id: l.characterId, position: l.position })),
      ...(m.unknownSpeakers || []).map((u) => ({ id: -u.slot, position: u.position })),
    ]
      .sort((a, b) => a.position - b.position)
      .map((s) => s.id),
    travels: { arrivals: [], departures: [] },
    createdAt: m.createdAt,
    updatedAt: m.updatedAt,
  }));
  for (const ext of extensions) if (ext.serialize) await ext.serialize(rows, json);
  return json;
}

const loadMessage = async (id) => {
  const message = await Message.findByPk(id, { include: [authorInclude] });
  return message ? (await serializeMessages([message]))[0] : null;
};

// Clé d'ordre de lecture d'un message
const READING_KEY = literal('COALESCE(`RpMessage`.`sortKey`, `RpMessage`.`id`)');

/** Messages correspondant à `where`, dans l'ordre de lecture (ordre d'écriture, sauf messages insérés). */
const listMessages = async (where) =>
  serializeMessages(await Message.findAll({ where, include: [authorInclude], order: [[READING_KEY, 'ASC'], ['id', 'ASC']] }));

/**
 * Clés d'ordre de `count` messages insérés juste après (`position.after`) ou juste avant (`position.before`) un
 * message de `scope` (ex. { episodeId }) : réparties entre ce message et son voisin. null : pas d'insertion (à la fin).
 */
async function insertionKeys(scope, position, count) {
  const after = toId(position?.after);
  const before = toId(position?.before);
  const anchorId = after || before;
  if (!anchorId) return null;
  const anchor = await Message.findOne({ where: { ...scope, id: anchorId }, attributes: ['id', 'sortKey'] });
  if (!anchor) throw httpError(404, 'Message de référence introuvable.');
  const key = anchor.sortKey ?? anchor.id;
  const neighbour = await Message.findOne({
    where: { ...scope, [Op.and]: [sequelize.where(READING_KEY, { [after ? Op.gt : Op.lt]: key })] },
    attributes: ['id', 'sortKey'],
    order: [[READING_KEY, after ? 'ASC' : 'DESC']],
  });
  // Sans voisin : jusqu'à une unité plus loin (avant le prochain id écrit à la fin)
  const other = neighbour ? neighbour.sortKey ?? neighbour.id : key + (after ? 1 : -1);
  const [lo, hi] = after ? [key, other] : [other, key];
  return Array.from({ length: count }, (_, i) => lo + ((hi - lo) * (i + 1)) / (count + 1));
}

// ---------------------------------------------------------------------------
// Écriture
// ---------------------------------------------------------------------------

/** L'utilisateur peut-il modifier cet épisode (via l'une de ses histoires) ? */
async function canEditEpisode(user, episodeId) {
  if (isAdmin(user)) return true;
  const episode = await Episode.findByPk(episodeId, { include: [{ model: Story, as: 'stories', attributes: ['id'] }] });
  if (!episode) return false;
  for (const story of episode.stories) if (await canEditEntity(user, 'story', story.id)) return true;
  return false;
}

/**
 * Vérifie les personnages au nom desquels on écrit : ils sont de l'univers, et (`linkedOnly`, roleplay) liés au compte.
 * Le récit d'un épisode s'écrit au nom de n'importe quel personnage de l'univers.
 */
async function checkSpeakers(user, universeId, characterIds, { linkedOnly = true } = {}) {
  if (!characterIds.length) return;
  const characters = await Character.findAll({ where: { id: characterIds, universe_id: universeId }, attributes: ['id'] });
  if (characters.length !== characterIds.length) throw httpError(400, 'Personnage inconnu dans cet univers.');
  if (!linkedOnly) return;
  for (const id of characterIds) {
    if (!(await canEditEntity(user, 'character', id))) {
      throw httpError(403, 'Vous ne pouvez écrire qu’au nom des personnages qui vous sont liés.');
    }
  }
}

/** Texte d'un message ; `allowEmpty` : message accompagné d'une image, d'un son, d'une commande. */
const cleanContent = (content, { allowEmpty = false } = {}) => {
  const text = typeof content === 'string' ? content.replace(/\r\n/g, '\n').trim() : '';
  if (!text && !allowEmpty) throw httpError(400, 'Le message est vide.');
  if (text.length > MAX_CONTENT) throw httpError(400, `Message trop long (${MAX_CONTENT} caractères maximum).`);
  return text;
};

/** Personnages de l'univers d'un message (`positions` : leur place parmi tous les personnages, inconnus compris). */
const setSpeakers = (messageId, { characterIds, positions }, transaction) =>
  MessageCharacter.destroy({ where: { messageId }, transaction }).then(() =>
    characterIds.length
      ? MessageCharacter.bulkCreate(characterIds.map((characterId, i) => ({ messageId, characterId, position: positions[i] })), { transaction })
      : null,
  );

const hrpOnly = (m, content) => !m.imagePath && !m.soundPath && !m.roll && !m.effect && isHrpContent(content);

/**
 * Nouveaux messages, envoyés d'un coup dans l'ordre (saisie avec /personnage ; un seul message = une partie) :
 * corps { parts: [{ content, characterIds, command? }] } en JSON, ou en multipart (`parts` en JSON, `image` / `sound`).
 * L'image va à la ligne « /fond » s'il y en a une, sinon au dernier message ; de même pour le son et « /ambiance ».
 * Tout ou rien : un message refusé annule les autres (et les fichiers reçus sont supprimés).
 * `destination(count)` → { universeId, values, linkedOnly, sortKeys? } : `values` = colonnes du message (placeId, episodeId,
 * offThread…) ; `sortKeys` : clés d'ordre des `count` messages insérés entre deux autres (voir insertionKeys).
 * Renvoie les messages créés (JSON).
 */
async function createMessages(req, destination) {
  const imageFile = req.files?.image?.[0];
  const soundFile = req.files?.sound?.[0];
  const upload = (file) => (file ? `/uploads/${path.relative(UPLOADS_ROOT, file.path).split(path.sep).join('/')}` : null);
  const imagePath = upload(imageFile);
  const soundPath = upload(soundFile);
  try {
    if (imageFile && imageFile.size > MAX_IMAGE_SIZE) throw httpError(400, 'Image trop lourde (5 Mo maximum).');
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
    const { universeId, values, linkedOnly = true, sortKeys = null } = await destination(parts.length);

    // Commandes (/d20, /fond...) : tirées ou reconnues ici ; le texte devient facultatif (commentaire)
    const commands = parts.map((part) => runCommand(part?.command));
    const target = (effect) => {
      const i = commands.findIndex((c) => c?.effect === effect);
      return i === -1 ? parts.length - 1 : i;
    };
    const imageIndex = target('background');
    const soundIndex = target('ambience');

    const cleaned = [];
    for (const [i, part] of parts.entries()) {
      const speakers = parseSpeakers(part?.characterIds);
      await checkSpeakers(req.user, universeId, speakers.characterIds, { linkedOnly });
      const image = i === imageIndex ? imagePath : null;
      const sound = i === soundIndex ? soundPath : null;
      const roll = commands[i]?.roll || null;
      let effect = commands[i]?.effect || null;
      // /fond sans image : fond retiré ; /ambiance sans son : silence
      if (effect === 'background' && !image) effect = 'background:none';
      if (effect === 'ambience' && !sound) effect = 'ambience:none';
      const content = cleanContent(part?.content, { allowEmpty: Boolean(roll || effect || image || sound) });
      cleaned.push({ content, speakers, roll, effect, imagePath: image, soundPath: sound, unknownSpeakers: speakers.unknown });
    }

    const ids = await sequelize.transaction(async (transaction) => {
      const created = [];
      for (const [i, { speakers, ...data }] of cleaned.entries()) {
        const message = await Message.create(
          { ...values, ...data, ...(sortKeys && { sortKey: sortKeys[i] }), universe_id: universeId, userId: req.user.id, isHrp: hrpOnly(data, data.content) },
          { transaction },
        );
        await setSpeakers(message.id, speakers, transaction);
        created.push(message.id);
      }
      return created;
    });
    return Promise.all(ids.map(loadMessage));
  } catch (error) {
    // Envoi refusé : les fichiers reçus ne servent à rien
    if (imagePath) deleteUpload(imagePath);
    if (soundPath) deleteUpload(soundPath);
    throw error;
  }
}

/** Message modifiable / supprimable : par son auteur, un admin, ou (récit d'épisode) qui peut modifier l'épisode. */
async function findManageable(req) {
  const message = await Message.findByPk(toId(req.params.id));
  if (!message) throw httpError(404, 'Message non trouvé');
  if (isAdmin(req.user) || message.userId === req.user.id) return message;
  if (message.episodeId && (await canEditEpisode(req.user, message.episodeId))) return message;
  throw httpError(403, 'Seul l’auteur du message peut le modifier.');
}

/** PUT /api/messages/:id — { content?, characterIds? } */
const updateMessage = handle('message', async (req, res) => {
  const message = await findManageable(req);
  const content = req.body?.content !== undefined
    ? cleanContent(req.body.content, { allowEmpty: Boolean(message.imagePath || message.soundPath || message.roll || message.effect) })
    : message.content;
  const speakers = req.body?.characterIds !== undefined ? parseSpeakers(req.body.characterIds) : null;

  const current = (await MessageCharacter.findAll({ where: { messageId: message.id }, order: [['position', 'ASC']], raw: true })).map((l) => l.characterId);
  if (speakers) {
    // Personnages déjà présents : conservés même si l'auteur n'est plus lié à eux
    await checkSpeakers(req.user, message.universe_id, speakers.characterIds.filter((id) => !current.includes(id)), { linkedOnly: !message.episodeId });
  }
  await sequelize.transaction(async (transaction) => {
    await message.update({ content, isHrp: hrpOnly(message, content), ...(speakers && { unknownSpeakers: speakers.unknown }) }, { transaction });
    if (speakers) await setSpeakers(message.id, speakers, transaction);
  });
  const updated = await loadMessage(message.id);
  res.json(updated);
  runHook('updated', updated, { previousCharacterIds: current });
});

/** DELETE /api/messages/:id — les fichiers joints sont supprimés avec lui. */
const deleteMessage = handle('message', async (req, res) => {
  const message = await findManageable(req);
  const characterIds = (await MessageCharacter.findAll({ where: { messageId: message.id }, raw: true })).map((l) => l.characterId);
  await message.destroy();
  if (message.imagePath) deleteUpload(message.imagePath);
  if (message.soundPath) deleteUpload(message.soundPath);
  res.json({ id: message.id });
  runHook('deleted', message, { characterIds });
});

/** Supprime des messages (`where`) et leurs fichiers joints (scène hors roleplay, épisode supprimés). */
async function destroyMessages(where) {
  const rows = await Message.findAll({ where, attributes: ['id', 'imagePath', 'soundPath'] });
  if (!rows.length) return;
  await Message.destroy({ where: { id: rows.map((m) => m.id) } });
  for (const m of rows) {
    if (m.imagePath) deleteUpload(m.imagePath);
    if (m.soundPath) deleteUpload(m.soundPath);
  }
}

module.exports = {
  httpError,
  toId,
  toIds,
  handle,
  attachmentsMiddleware,
  extendMessages,
  authorInclude,
  serializeMessages,
  loadMessage,
  listMessages,
  insertionKeys,
  canEditEpisode,
  createMessages,
  updateMessage,
  deleteMessage,
  destroyMessages,
};
