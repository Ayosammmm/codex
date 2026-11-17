/**
 * Mods : lecture et validation du manifeste (manifest.json à la racine de l'archive du mod),
 * et nettoyage des valeurs des champs personnalisés.
 *
 * Format du manifeste (voir Obsidian/Modding.md pour la documentation complète) :
 * {
 *   id: 'mon-mod', name: 'Mon mod', version: '1.0.0', description, author, icon,
 *   entityTypes: [{ key, label, plural, feminine, path, icon, description, hierarchy, navSection, fields: [...] }],
 *   fields: { character: [...], place: [...], ... },     // métadonnées ajoutées aux entités existantes
 *   pages: [{ key, label, path, icon, entry, navSection }] // pages de code (iframe isolée)
 * }
 *
 * Un champ : { key, label, type, hint, options, min, max, unit, entity, multiple, table, card }
 */

const httpError = (message, status = 400) => Object.assign(new Error(message), { status });

/** Entités de base pouvant recevoir des champs de mods (et être référencées). */
const BASE_ENTITY_TYPES = ['character', 'place', 'group', 'specie', 'creature', 'story', 'event'];
/** Types d'entités qu'une valeur « référence » peut désigner (`custom` : entité d'un type de mod). */
const REF_TYPES = [...BASE_ENTITY_TYPES, 'custom'];

const FIELD_TYPES = ['text', 'richtext', 'number', 'boolean', 'date', 'select', 'multiselect', 'color', 'url', 'ref'];
const NAV_SECTIONS = ['encyclopedia', 'games'];

const MOD_ID = /^[a-z0-9][a-z0-9-]{1,39}$/;
const KEY = /^[a-z][a-z0-9-]{0,39}$/;
const FIELD_KEY = /^[a-zA-Z][a-zA-Z0-9_]{0,39}$/;
const PATH = /^[a-z0-9][a-z0-9-]{0,39}$/;
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const ISO_DATE = /^-?\d{1,6}-\d{2}-\d{2}$/;
const ICON = /^[A-Za-z0-9]{1,40}$/;

const LIMITS = { entityTypes: 20, fields: 60, pages: 10, options: 100 };

const str = (value, max, fallback = null) => {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim().slice(0, max);
  return trimmed || fallback;
};
const num = (value) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

function normalizeOptions(options, where) {
  if (!Array.isArray(options) || !options.length) throw httpError(`${where} : « options » doit être une liste non vide.`);
  if (options.length > LIMITS.options) throw httpError(`${where} : ${LIMITS.options} options au maximum.`);
  const seen = new Set();
  return options.map((option) => {
    const raw = typeof option === 'string' ? { value: option, label: option } : option || {};
    const value = str(String(raw.value ?? ''), 100);
    if (!value) throw httpError(`${where} : option sans valeur.`);
    if (seen.has(value)) throw httpError(`${where} : option « ${value} » en double.`);
    seen.add(value);
    return { value, label: str(raw.label, 100, value), ...(HEX_COLOR.test(raw.color || '') && { color: raw.color.toLowerCase() }) };
  });
}

/** Valide une liste de champs. `ownTypes` : clés des types d'entités du mod (cibles possibles d'une référence). */
function normalizeFields(fields, where, ownTypes) {
  if (fields == null) return [];
  if (!Array.isArray(fields)) throw httpError(`${where} : « fields » doit être une liste.`);
  if (fields.length > LIMITS.fields) throw httpError(`${where} : ${LIMITS.fields} champs au maximum.`);
  const seen = new Set();
  return fields.map((raw, index) => {
    const at = `${where}, champ n°${index + 1}`;
    if (!raw || typeof raw !== 'object') throw httpError(`${at} : définition invalide.`);
    if (!FIELD_KEY.test(raw.key || '')) throw httpError(`${at} : clé invalide (lettres, chiffres et _ ; commence par une lettre).`);
    if (seen.has(raw.key)) throw httpError(`${at} : clé « ${raw.key} » en double.`);
    seen.add(raw.key);
    const type = raw.type || 'text';
    if (!FIELD_TYPES.includes(type)) throw httpError(`${at} : type « ${type} » inconnu (${FIELD_TYPES.join(', ')}).`);

    const field = {
      key: raw.key,
      label: str(raw.label, 80, raw.key),
      type,
      ...(str(raw.hint, 300) && { hint: str(raw.hint, 300) }),
      // Affichage : colonne visible par défaut dans le tableau, ligne sur les cartes de la galerie
      table: raw.table !== false,
      card: raw.card === true,
    };
    if (type === 'select' || type === 'multiselect') field.options = normalizeOptions(raw.options, at);
    if (type === 'number') {
      if (num(raw.min) != null) field.min = raw.min;
      if (num(raw.max) != null) field.max = raw.max;
      if (str(raw.unit, 20)) field.unit = str(raw.unit, 20);
    }
    if (type === 'ref') {
      const entity = raw.entity;
      if (BASE_ENTITY_TYPES.includes(entity)) field.entity = entity;
      else if (ownTypes.includes(entity)) field.entity = `custom:${entity}`;
      else throw httpError(`${at} : « entity » doit être ${BASE_ENTITY_TYPES.join(', ')} ou un type d'entité du mod.`);
      field.multiple = raw.multiple === true;
    }
    return field;
  });
}

/**
 * Valide et normalise un manifeste. `files` (facultatif) : chemins des fichiers du mod,
 * pour vérifier que les pages existent. Lève une erreur 400 lisible.
 */
function normalizeManifest(raw, { files } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw httpError('manifest.json invalide.');
  if (!MOD_ID.test(raw.id || '')) throw httpError('« id » invalide : 2 à 40 caractères, minuscules, chiffres et tirets.');
  const name = str(raw.name, 80);
  if (!name) throw httpError('« name » est requis.');

  const rawTypes = raw.entityTypes ?? [];
  if (!Array.isArray(rawTypes)) throw httpError('« entityTypes » doit être une liste.');
  if (rawTypes.length > LIMITS.entityTypes) throw httpError(`${LIMITS.entityTypes} types d'entités au maximum.`);
  const ownTypes = rawTypes.map((t) => t?.key);
  const paths = new Set();
  const usePath = (path, where) => {
    if (!PATH.test(path)) throw httpError(`${where} : chemin « ${path} » invalide (minuscules, chiffres et tirets).`);
    if (paths.has(path)) throw httpError(`${where} : chemin « ${path} » déjà utilisé dans le mod.`);
    paths.add(path);
    return path;
  };

  const typeKeys = new Set();
  const entityTypes = rawTypes.map((t, index) => {
    const at = `Type d'entité n°${index + 1}`;
    if (!t || typeof t !== 'object') throw httpError(`${at} : définition invalide.`);
    if (!KEY.test(t.key || '')) throw httpError(`${at} : clé invalide (minuscules, chiffres et tirets).`);
    if (BASE_ENTITY_TYPES.includes(t.key) || t.key === 'custom') throw httpError(`${at} : la clé « ${t.key} » est réservée.`);
    if (typeKeys.has(t.key)) throw httpError(`${at} : clé « ${t.key} » en double.`);
    typeKeys.add(t.key);
    const label = str(t.label, 60);
    if (!label) throw httpError(`${at} : « label » est requis.`);
    return {
      key: t.key,
      label,
      plural: str(t.plural, 60, `${label}s`),
      feminine: t.feminine === true,
      path: usePath(t.path || t.key, at),
      icon: ICON.test(t.icon || '') ? t.icon : null,
      description: str(t.description, 300),
      hierarchy: t.hierarchy === true,
      navSection: NAV_SECTIONS.includes(t.navSection) ? t.navSection : 'encyclopedia',
      fields: normalizeFields(t.fields, `Type « ${t.key} »`, ownTypes),
    };
  });

  const fields = {};
  if (raw.fields != null) {
    if (typeof raw.fields !== 'object' || Array.isArray(raw.fields)) throw httpError('« fields » doit être un objet { character: [...], ... }.');
    for (const [entityType, list] of Object.entries(raw.fields)) {
      if (!BASE_ENTITY_TYPES.includes(entityType)) throw httpError(`« fields » : type « ${entityType} » inconnu (${BASE_ENTITY_TYPES.join(', ')}).`);
      const normalized = normalizeFields(list, `Champs de « ${entityType} »`, ownTypes);
      if (normalized.length) fields[entityType] = normalized;
    }
  }

  const rawPages = raw.pages ?? [];
  if (!Array.isArray(rawPages)) throw httpError('« pages » doit être une liste.');
  if (rawPages.length > LIMITS.pages) throw httpError(`${LIMITS.pages} pages au maximum.`);
  const pageKeys = new Set();
  const pages = rawPages.map((p, index) => {
    const at = `Page n°${index + 1}`;
    if (!p || typeof p !== 'object') throw httpError(`${at} : définition invalide.`);
    if (!KEY.test(p.key || '')) throw httpError(`${at} : clé invalide.`);
    if (pageKeys.has(p.key)) throw httpError(`${at} : clé « ${p.key} » en double.`);
    pageKeys.add(p.key);
    const label = str(p.label, 60);
    if (!label) throw httpError(`${at} : « label » est requis.`);
    const entry = String(p.entry || 'index.html').replace(/^\.?\//, '');
    if (!/^[\w./-]+\.html?$/.test(entry) || entry.split('/').includes('..')) throw httpError(`${at} : « entry » doit être un fichier .html du mod.`);
    if (files && !files.includes(entry)) throw httpError(`${at} : le fichier « ${entry} » est absent de l'archive.`);
    return {
      key: p.key,
      label,
      path: usePath(p.path || p.key, at),
      icon: ICON.test(p.icon || '') ? p.icon : null,
      description: str(p.description, 300),
      entry,
      navSection: NAV_SECTIONS.includes(p.navSection) ? p.navSection : 'games',
    };
  });

  if (!entityTypes.length && !Object.keys(fields).length && !pages.length) {
    throw httpError('Le mod ne déclare rien : ajoutez des « entityTypes », des « fields » ou des « pages ».');
  }

  return {
    id: raw.id,
    name,
    version: str(raw.version, 20, '1.0.0'),
    description: str(raw.description, 1000),
    author: str(raw.author, 80),
    icon: ICON.test(raw.icon || '') ? raw.icon : null,
    entityTypes,
    fields,
    pages,
  };
}

// ---------------------------------------------------------------------------
// Valeurs des champs
// ---------------------------------------------------------------------------

const toRef = (value) => {
  const type = value?.type;
  const id = Number(value?.id);
  return REF_TYPES.includes(type) && Number.isInteger(id) && id > 0 ? { type, id } : null;
};

/** Valeur nettoyée d'un champ, ou undefined (champ vide : non enregistré). */
function cleanValue(field, value) {
  if (value == null || value === '') return undefined;
  switch (field.type) {
    case 'text':
      return str(value, 1000) ?? undefined;
    case 'richtext':
      return typeof value === 'string' && value.trim() ? value.slice(0, 100000) : undefined;
    case 'number': {
      let n = typeof value === 'string' ? Number(value.replace(',', '.')) : value;
      if (typeof n !== 'number' || !Number.isFinite(n)) return undefined;
      if (field.min != null) n = Math.max(field.min, n);
      if (field.max != null) n = Math.min(field.max, n);
      return n;
    }
    case 'boolean':
      return typeof value === 'boolean' ? value : undefined;
    case 'date':
      return typeof value === 'string' && ISO_DATE.test(value) ? value : undefined;
    case 'select':
      return field.options.some((o) => o.value === value) ? value : undefined;
    case 'multiselect': {
      const list = Array.isArray(value) ? [...new Set(value)].filter((v) => field.options.some((o) => o.value === v)) : [];
      return list.length ? list : undefined;
    }
    case 'color':
      return typeof value === 'string' && HEX_COLOR.test(value) ? value.toLowerCase() : undefined;
    case 'url':
      return typeof value === 'string' && /^https?:\/\/\S+$/i.test(value.trim()) ? value.trim().slice(0, 2000) : undefined;
    case 'ref': {
      const expected = field.entity.startsWith('custom:') ? 'custom' : field.entity;
      const seen = new Set();
      const list = (Array.isArray(value) ? value : [value])
        .map(toRef)
        .filter((r) => r && r.type === expected && !seen.has(r.id) && seen.add(r.id));
      const kept = field.multiple ? list.slice(0, 500) : list.slice(0, 1);
      return kept.length ? kept : undefined;
    }
    default:
      return undefined;
  }
}

/**
 * Valeurs nettoyées pour une liste de champs : { clé: valeur } (champs inconnus ou vides retirés).
 * `previous` : valeurs déjà enregistrées, conservées pour les clés absentes de `values` (mise à jour partielle).
 */
function cleanValues(fields, values, previous = {}) {
  // Valeurs de champs qu'une version du mod a retirés : conservées (une mise à jour du mod ne perd rien)
  const known = new Set(fields.map((f) => f.key));
  const out = Object.fromEntries(Object.entries(previous || {}).filter(([key]) => !known.has(key)));
  const input = values && typeof values === 'object' ? values : {};
  for (const field of fields) {
    const raw = field.key in input ? input[field.key] : previous?.[field.key];
    const value = cleanValue(field, raw);
    if (value !== undefined) out[field.key] = value;
  }
  return out;
}

module.exports = {
  BASE_ENTITY_TYPES,
  REF_TYPES,
  FIELD_TYPES,
  MOD_ID,
  httpError,
  normalizeManifest,
  cleanValues,
};
