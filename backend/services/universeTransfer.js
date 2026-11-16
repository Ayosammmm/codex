/**
 * Lecture, import, duplication et suppression complète d'un univers.
 *
 * Toutes ces opérations reposent sur la même description des tables :
 * - ENTITY_TABLES : tables possédant un `universe_id` (ordre = ordre d'insertion)
 * - JOIN_TABLES   : tables de liaison entre entités
 * - les photos d'album (entity_photos), liées par (entityType, entityId)
 * - les liens entité ↔ collection (entity_collections), liés par (collectionId, entityType, entityId)
 *
 * Format des données exportées (voir aussi services/universeArchive.js pour l'archive ZIP) :
 * {
 *   format: 'almanach-universe', version, exportedAt,
 *   universe: { name, description, theme, colors, ... },
 *   entities: { characters: [...], places: [...], ... },
 *   joins:    { characters_groups: [...], ... },
 *   photos:   [...],
 *   collectionLinks: [...],
 *   files:    { '/uploads/...': 'data:image/png;base64,...' }   // anciens exports JSON (version 1) uniquement
 * }
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Op } = require('sequelize');
const sequelize = require('../config/database');

const Univers = require('../models/Univers');
const Character = require('../models/Character');
const Place = require('../models/Place');
const Group = require('../models/Group');
const Specie = require('../models/Specie');
const Gender = require('../models/Gender');
const Status = require('../models/Status');
const Alignment = require('../models/Alignment');
const PowerRank = require('../models/PowerRank');
const PlaceType = require('../models/PlaceType');
const GroupType = require('../models/GroupType');
const Creature = require('../models/Creature');
const Story = require('../models/Story');
const Episode = require('../models/Episode');
const Event = require('../models/Event');
const EntityPhoto = require('../models/EntityPhoto');
const Collection = require('../models/Collection');
const EntityCollection = require('../models/EntityCollection');
const User = require('../models/User');
const { RpScene, RpMessage } = require('../models/Roleplay');

const FORMAT = 'almanach-universe';
const UPLOADS_ROOT = path.resolve(__dirname, '..', 'uploads');
const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.avif', '.svg', '.bmp']);
// Fichiers copiés avec un univers : images et sons (module « Son »)
const MEDIA_EXTENSIONS = new Set([...IMAGE_EXTENSIONS, ...require('../middlewares/upload').AUDIO_EXTENSIONS]);

// refs     : colonne -> clé de la table référencée
// selfRef  : colonne de hiérarchie (parent dans la même table)
// files    : colonnes contenant un chemin d'image
// users    : colonnes contenant un id de compte (vidées à l'import si le compte n'existe pas sur ce serveur)
// keepTimestamps : dates de création / modification conservées (messages de roleplay)
const ENTITY_TABLES = [
  { key: 'genders', model: Gender },
  { key: 'statuses', model: Status },
  { key: 'alignments', model: Alignment },
  { key: 'powerRanks', model: PowerRank },
  { key: 'placeTypes', model: PlaceType },
  { key: 'groupTypes', model: GroupType },
  { key: 'collections', model: Collection },
  { key: 'species', model: Specie, selfRef: 'parentId', files: ['image', 'background'] },
  { key: 'places', model: Place, selfRef: 'parentId', refs: { placeTypeId: 'placeTypes' }, files: ['banner', 'background', 'mapImage', 'themeSound', 'ambientSound'] },
  { key: 'groups', model: Group, selfRef: 'parentId', refs: { groupTypeId: 'groupTypes' }, files: ['image', 'banner', 'background', 'themeSound'] },
  {
    key: 'characters', model: Character, files: ['avatar', 'background', 'themeSound'],
    refs: { sexe_id: 'genders', statut_id: 'statuses', rank_id: 'powerRanks', alignment_id: 'alignments' },
  },
  { key: 'creatures', model: Creature, refs: { powerRankId: 'powerRanks' }, files: ['image', 'background'] },
  { key: 'stories', model: Story, files: ['image', 'background'] },
  { key: 'episodes', model: Episode, files: ['background'] },
  { key: 'events', model: Event, files: ['image', 'background'] },
  { key: 'rpScenes', model: RpScene, refs: { placeId: 'places' }, users: ['createdBy'], keepTimestamps: true },
  { key: 'rpMessages', model: RpMessage, refs: { placeId: 'places', sceneId: 'rpScenes' }, users: ['userId'], keepTimestamps: true, files: ['imagePath', 'soundPath'] },
];

// La première colonne sert de filtre à l'export
const JOIN_TABLES = [
  { table: 'characters_groups', refs: { character_id: 'characters', group_id: 'groups' } },
  { table: 'characters_places', refs: { character_id: 'characters', place_id: 'places' } },
  { table: 'characters_species', refs: { character_id: 'characters', specie_id: 'species' } },
  { table: 'character_relations', refs: { character1_id: 'characters', character2_id: 'characters' } },
  { table: 'groups_places', refs: { group_id: 'groups', place_id: 'places' } },
  { table: 'creature_places', refs: { creatureId: 'creatures', placeId: 'places' } },
  { table: 'stories_episodes', refs: { story_id: 'stories', episode_id: 'episodes' } },
  { table: 'episodes_characters', refs: { episode_id: 'episodes', character_id: 'characters' } },
  { table: 'episodes_places', refs: { episode_id: 'episodes', place_id: 'places' } },
  { table: 'episodes_events', refs: { episode_id: 'episodes', event_id: 'events' } },
  { table: 'events_characters', refs: { event_id: 'events', character_id: 'characters' } },
  { table: 'events_places', refs: { event_id: 'events', place_id: 'places' } },
  { table: 'events_groups', refs: { event_id: 'events', group_id: 'groups' } },
  { table: 'rp_message_characters', refs: { messageId: 'rpMessages', characterId: 'characters' } },
  { table: 'rp_scene_episodes', refs: { sceneId: 'rpScenes', episodeId: 'episodes' } },
];

const PHOTO_ENTITY_TABLES = { character: 'characters', creature: 'creatures', place: 'places', group: 'groups', specie: 'species' };
// Entités pouvant être rangées dans une collection
const COLLECTION_ENTITY_TABLES = { ...PHOTO_ENTITY_TABLES, story: 'stories', event: 'events' };
const UNIVERSE_FILES = ['logo', 'banner', 'background'];
const UNIVERSE_FIELDS = [
  'name', 'description', 'theme', 'colors', 'backgroundColor', 'scrimColor', 'modules',
  'personalityModuleEnabled', 'bestiaryEnabled', 'storiesEnabled',
];

// ---------------------------------------------------------------------------
// Fichiers
// ---------------------------------------------------------------------------

const isLocalUpload = (p) => typeof p === 'string' && p.startsWith('/uploads/');

/** Chemin absolu d'un fichier /uploads/..., ou null s'il sort du dossier uploads. */
const resolveUpload = (uploadPath) => {
  if (!isLocalUpload(uploadPath)) return null;
  const abs = path.resolve(UPLOADS_ROOT, uploadPath.slice('/uploads/'.length));
  return abs.startsWith(UPLOADS_ROOT + path.sep) ? abs : null;
};

const readUploadFromDisk = (uploadPath) => {
  const abs = resolveUpload(uploadPath);
  if (!abs || !fs.existsSync(abs)) return null;
  return fs.readFileSync(abs);
};

const fromDataUrl = (dataUrl) => {
  const match = typeof dataUrl === 'string' && dataUrl.match(/^data:[^;,]+;base64,(.*)$/s);
  return match ? Buffer.from(match[1], 'base64') : null;
};

const unlinkQuietly = (abs) => {
  try {
    if (abs && fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch (err) {
    console.error(`Impossible de supprimer ${abs}:`, err.message);
  }
};

/** Supprime un fichier /uploads/... du disque (ignore les URL externes). */
const deleteUpload = (uploadPath) => unlinkQuietly(resolveUpload(uploadPath));

/**
 * Crée une copie d'un fichier sous un nouveau nom, dans le même sous-dossier d'uploads.
 * - URL externe : conservée telle quelle
 * - fichier introuvable / chemin invalide : null
 */
const makeFileCopier = (readFile, written) => (uploadPath) => {
  if (!uploadPath) return null;
  if (!isLocalUpload(uploadPath)) return /^https?:\/\//.test(uploadPath) ? uploadPath : null;

  const original = resolveUpload(uploadPath);
  const ext = path.extname(uploadPath).toLowerCase();
  if (!original || !MEDIA_EXTENSIONS.has(ext)) return null;

  const buffer = readFile(uploadPath);
  if (!buffer) return null;

  const dir = path.dirname(original);
  fs.mkdirSync(dir, { recursive: true });
  const filename = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
  const target = path.join(dir, filename);
  fs.writeFileSync(target, buffer);
  written.push(target);

  return '/uploads/' + path.relative(UPLOADS_ROOT, target).split(path.sep).join('/');
};

// ---------------------------------------------------------------------------
// Lecture
// ---------------------------------------------------------------------------

const plainUniverse = (universe) => {
  const json = universe.toJSON();
  const out = {};
  for (const field of [...UNIVERSE_FIELDS, ...UNIVERSE_FILES]) out[field] = json[field] ?? null;
  return out;
};

/** Toutes les données d'un univers (sans les fichiers). */
const collectUniverse = async (universeId, { transaction } = {}) => {
  const universe = await Univers.findByPk(universeId, { transaction });
  if (!universe) return null;

  const entities = {};
  const ids = {};
  for (const { key, model } of ENTITY_TABLES) {
    entities[key] = await model.findAll({ where: { universe_id: universeId }, raw: true, transaction });
    ids[key] = entities[key].map((row) => row.id);
  }

  const joins = {};
  for (const { table, refs } of JOIN_TABLES) {
    const [filterColumn, filterTable] = Object.entries(refs)[0];
    if (!ids[filterTable].length) {
      joins[table] = [];
      continue;
    }
    const [rows] = await sequelize.query(
      `SELECT * FROM \`${table}\` WHERE \`${filterColumn}\` IN (:ids)`,
      { replacements: { ids: ids[filterTable] }, transaction },
    );
    joins[table] = rows;
  }

  const photoConditions = Object.entries(PHOTO_ENTITY_TABLES)
    .filter(([, key]) => ids[key].length)
    .map(([entityType, key]) => ({ entityType, entityId: { [Op.in]: ids[key] } }));
  const photos = photoConditions.length
    ? await EntityPhoto.findAll({ where: { [Op.or]: photoConditions }, raw: true, transaction })
    : [];

  const collectionLinks = ids.collections.length
    ? await EntityCollection.findAll({ where: { collectionId: { [Op.in]: ids.collections } }, raw: true, transaction })
    : [];

  return { universe: plainUniverse(universe), entities, joins, photos, collectionLinks };
};

/** Liste de tous les chemins d'images référencés par un univers. */
const listFiles = (data) => {
  const files = UNIVERSE_FILES.map((f) => data.universe[f]);
  for (const { key, files: fileColumns = [] } of ENTITY_TABLES) {
    for (const row of data.entities[key] || []) {
      for (const column of fileColumns) files.push(row[column]);
    }
  }
  for (const photo of data.photos || []) files.push(photo.imagePath);
  return [...new Set(files.filter(isLocalUpload))];
};

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

const withoutKeys = (row, keys) => {
  const out = { ...row };
  for (const key of keys) delete out[key];
  return out;
};

const sanitizeUniverseData = (source, copyFile, nameOverride) => {
  const data = {};
  for (const field of UNIVERSE_FIELDS) {
    if (source[field] !== undefined) data[field] = source[field];
  }
  for (const field of ['modules', 'colors']) {
    if (typeof data[field] === 'string') {
      try { data[field] = JSON.parse(data[field]); } catch { data[field] = null; }
    }
  }
  data.name = (nameOverride || source.name || '').toString().trim() || 'Univers importé';
  if (!data.theme) delete data.theme;
  for (const field of UNIVERSE_FILES) data[field] = copyFile(source[field]);
  return data;
};

/**
 * Crée un nouvel univers à partir de données exportées.
 * @param {object} data           Données au format d'export (ou issues de collectUniverse)
 * @param {object} options
 * @param {function} options.readFile     (uploadPath) => Buffer|null
 * @param {string}   [options.name]       Nom imposé au nouvel univers
 * @param {object}   [options.transaction] Transaction externe (sinon une transaction est créée)
 */
const importUniverse = async (data, { readFile, name, transaction: outerTransaction } = {}) => {
  if (!data || typeof data !== 'object' || !data.universe || !data.entities) {
    const error = new Error("Le fichier n'est pas un export d'univers valide.");
    error.status = 400;
    throw error;
  }
  if (data.format && data.format !== FORMAT) {
    const error = new Error(`Format inconnu : ${data.format}`);
    error.status = 400;
    throw error;
  }

  const written = [];
  const copyFile = makeFileCopier(readFile, written);

  const run = async (transaction) => {
    const universe = await Univers.create(sanitizeUniverseData(data.universe, copyFile, name), { transaction });

    const idMaps = {};
    // Comptes existants sur ce serveur (un export peut venir d'une autre installation)
    const userIds = new Set((await User.findAll({ attributes: ['id'], raw: true, transaction })).map((u) => u.id));

    for (const { key, model, refs = {}, selfRef, files = [], users = [], keepTimestamps } of ENTITY_TABLES) {
      const map = new Map();
      idMaps[key] = map;
      const pendingParents = [];

      for (const row of data.entities[key] || []) {
        const values = withoutKeys(row, ['id', 'universe_id', ...(keepTimestamps ? [] : ['createdAt', 'updatedAt'])]);
        for (const column of users) if (!userIds.has(values[column])) values[column] = null;
        for (const [column, refKey] of Object.entries(refs)) {
          values[column] = values[column] == null ? null : idMaps[refKey].get(values[column]) ?? null;
        }
        if (selfRef) {
          if (values[selfRef] != null) pendingParents.push({ oldId: row.id, oldParent: values[selfRef] });
          values[selfRef] = null;
        }
        for (const column of files) values[column] = copyFile(values[column]);

        // `silent` : garde la date de modification d'origine
        const created = await model.create({ ...values, universe_id: universe.id }, { transaction, silent: Boolean(keepTimestamps) });
        map.set(row.id, created.id);
      }

      for (const { oldId, oldParent } of pendingParents) {
        const parentId = map.get(oldParent);
        if (parentId) await model.update({ [selfRef]: parentId }, { where: { id: map.get(oldId) }, transaction });
      }
    }

    const now = new Date();
    for (const { table, refs } of JOIN_TABLES) {
      const rows = [];
      for (const row of data.joins?.[table] || []) {
        const values = { ...row };
        let valid = true;
        for (const [column, refKey] of Object.entries(refs)) {
          values[column] = idMaps[refKey].get(row[column]);
          if (values[column] === undefined) valid = false;
        }
        if (!valid) continue;
        if ('createdAt' in values) values.createdAt = now;
        if ('updatedAt' in values) values.updatedAt = now;
        rows.push(values);
      }
      if (rows.length) await sequelize.getQueryInterface().bulkInsert(table, rows, { transaction });
    }

    for (const photo of data.photos || []) {
      const entityId = idMaps[PHOTO_ENTITY_TABLES[photo.entityType]]?.get(photo.entityId);
      const imagePath = entityId ? copyFile(photo.imagePath) : null;
      if (!imagePath) continue;
      await EntityPhoto.create({
        entityType: photo.entityType,
        entityId,
        imagePath,
        caption: photo.caption ?? null,
        order: photo.order ?? null,
      }, { transaction });
    }

    const links = [];
    for (const link of data.collectionLinks || []) {
      const collectionId = idMaps.collections.get(link.collectionId);
      const entityId = idMaps[COLLECTION_ENTITY_TABLES[link.entityType]]?.get(link.entityId);
      if (collectionId && entityId) links.push({ collectionId, entityType: link.entityType, entityId });
    }
    if (links.length) await EntityCollection.bulkCreate(links, { transaction, ignoreDuplicates: true });

    return universe;
  };

  try {
    return outerTransaction ? await run(outerTransaction) : await sequelize.transaction(run);
  } catch (error) {
    written.forEach(unlinkQuietly);
    throw error;
  }
};

/** Importe un ancien export JSON (images embarquées en data URL). */
const importFromExport = (data, options = {}) =>
  importUniverse(data, { ...options, readFile: (p) => fromDataUrl(data.files?.[p]) });

/** Duplique un univers existant (copie des images sur le disque). */
const duplicateUniverse = async (universeId, { name } = {}) => {
  const data = await collectUniverse(universeId);
  if (!data) return null;
  return importUniverse(data, { readFile: readUploadFromDisk, name: name || `${data.universe.name} (copie)` });
};

// ---------------------------------------------------------------------------
// Suppression
// ---------------------------------------------------------------------------

/** Supprime un univers, toutes ses entités, ses liaisons, ses photos et ses images. */
const deleteUniverse = async (universeId) => {
  const data = await collectUniverse(universeId);
  if (!data) return null;

  await sequelize.transaction(async (transaction) => {
    for (const photo of data.photos) {
      await EntityPhoto.destroy({ where: { id: photo.id }, transaction });
    }
    if (data.collectionLinks.length) {
      await EntityCollection.destroy({ where: { collectionId: { [Op.in]: data.entities.collections.map((c) => c.id) } }, transaction });
    }
    for (const { table } of JOIN_TABLES) {
      // Les liaisons sont normalement supprimées en cascade ; on le fait explicitement par sécurité
      const rows = data.joins[table];
      if (!rows.length) continue;
      const { refs } = JOIN_TABLES.find((j) => j.table === table);
      const [filterColumn, filterTable] = Object.entries(refs)[0];
      const ids = data.entities[filterTable].map((r) => r.id);
      await sequelize.query(`DELETE FROM \`${table}\` WHERE \`${filterColumn}\` IN (:ids)`, {
        replacements: { ids }, transaction,
      });
    }
    for (const { model, selfRef } of [...ENTITY_TABLES].reverse()) {
      if (selfRef) await model.update({ [selfRef]: null }, { where: { universe_id: universeId }, transaction });
      await model.destroy({ where: { universe_id: universeId }, transaction });
    }
    await Univers.destroy({ where: { id: universeId }, transaction });
  });

  listFiles(data).forEach(deleteUpload);

  return Object.fromEntries(ENTITY_TABLES.map(({ key }) => [key, data.entities[key].length]));
};

// ---------------------------------------------------------------------------
// Statistiques (cartes de la page d'accueil)
// ---------------------------------------------------------------------------

const STATS_TABLES = ['characters', 'places', 'groups', 'species', 'creatures', 'stories', 'events'];

const countByUniverse = async () => {
  const stats = {};
  for (const key of STATS_TABLES) {
    const { model } = ENTITY_TABLES.find((t) => t.key === key);
    const rows = await model.findAll({
      attributes: ['universe_id', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
      where: { universe_id: { [Op.ne]: null } },
      group: ['universe_id'],
      raw: true,
    });
    for (const { universe_id: id, count } of rows) {
      stats[id] ??= {};
      stats[id][key] = Number(count);
    }
  }
  return stats;
};

module.exports = {
  importFromExport,
  duplicateUniverse,
  deleteUniverse,
  deleteUpload,
  countByUniverse,
  // utilisés par l'archive ZIP (universeArchive.js), les tests et les scripts
  FORMAT,
  IMAGE_EXTENSIONS,
  MEDIA_EXTENSIONS,
  collectUniverse,
  listFiles,
  isLocalUpload,
  resolveUpload,
  importUniverse,
  readUploadFromDisk,
};
