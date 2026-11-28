import { request } from '@/api/client';
import { RESOURCES } from '@/api/resources';
import { universesApi } from '@/api/universes';
import { modsApi } from '@/api/mods';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { characterName } from '@/config/characters';
import { universePath } from '@/utils/universe';

/**
 * Liens automatiques vers les entités de l'univers dans les textes riches.
 *
 * Les noms d'entités (personnages, lieux, groupes…) trouvés dans les grands champs de texte riche deviennent
 * des liens vers leur fiche, enregistrés dans le texte : on peut ensuite les modifier ou les retirer dans l'éditeur.
 * - À l'enregistrement d'une fiche (useSaveEntity, formes des personnages) : ses champs riches sont traités.
 * - Pour tout l'univers : linkUniverse (paramètres de l'univers), qui ne réécrit que les champs riches.
 *
 * Règles : toutes les occurrences, nom exact (majuscules comprises), mot entier ; personnages : nom complet et
 * prénom seul s'il n'est porté par aucun autre personnage. Un nom porté par plusieurs entités est ignoré (ambigu),
 * comme les noms de moins de 3 caractères. Pas de lien dans un lien existant, du code, ni vers la fiche elle-même.
 */

/** Champs de texte riche traités, par ressource (le serveur a la même liste : backend/services/richLinks.js). */
export const RICH_FIELDS = {
  characters: ['powers', 'personality', 'story', 'extras', 'developmentNote'],
  places: ['description'],
  groups: ['description'],
  species: ['description'],
  creatures: ['attackTypes', 'moreDetails'],
  stories: ['description'],
  events: ['description'],
  customEntities: ['description'],
};

// Entités pouvant être citées : ressource, segment d'URL, module requis (null : toujours actif)
const LINKABLE = [
  { resource: 'characters', path: 'personnages', module: null },
  { resource: 'places', path: 'lieux', module: null },
  { resource: 'groups', path: 'groupes', module: 'groups' },
  { resource: 'species', path: 'especes', module: 'species' },
  { resource: 'creatures', path: 'bestiaire', module: 'creatures' },
  { resource: 'stories', path: 'histoires', module: 'stories' },
  { resource: 'events', path: 'evenements', module: 'events' },
];

const MIN_LENGTH = 3;
const SKIPPED = 'a, code, pre';
const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Mêmes clés que api/queries.js (entityKeys, universeKeys) : les listes déjà chargées sont réutilisées
const listKey = (resource, universeId) => ['entities', resource, 'list', Number(universeId)];
const universeKey = (id) => ['universes', 'detail', Number(id)];

/**
 * Cibles des liens d'un univers : { pattern (RegExp), byName: Map(nom → { key, href }) }, ou null s'il n'y en a pas.
 * `key` : « ressource:id », pour ne pas lier une fiche à elle-même.
 */
export async function loadLinkTargets(queryClient, universeId) {
  const universe = await queryClient.ensureQueryData({ queryKey: universeKey(universeId), queryFn: () => universesApi.get(universeId) });
  const modules = getModulesState(universe);
  const list = (resource) => queryClient.ensureQueryData({ queryKey: listKey(resource, universeId), queryFn: () => RESOURCES[resource].list(universeId) });

  const candidates = []; // [nom, { key, href }]
  const add = (name, key, sub) => {
    const text = name?.trim();
    if (text && text.length >= MIN_LENGTH) candidates.push([text, { key, href: universePath(universe, sub) }]);
  };

  for (const { resource, path, module } of LINKABLE) {
    if (module && !isModuleEnabled(modules, module)) continue;
    const items = await list(resource);
    if (resource === 'characters') {
      // Prénom seul : seulement s'il n'est porté que par un personnage
      const firstnames = new Map();
      for (const c of items) if (c.firstname?.trim()) firstnames.set(c.firstname.trim(), (firstnames.get(c.firstname.trim()) || 0) + 1);
      for (const c of items) {
        const full = c.firstname?.trim() || c.name?.trim() ? characterName(c) : null; // pas « Sans nom »
        add(full, `characters:${c.id}`, `${path}/${c.id}`);
        const first = c.firstname?.trim();
        if (first && first !== full && firstnames.get(first) === 1) add(first, `characters:${c.id}`, `${path}/${c.id}`);
      }
    } else {
      for (const item of items) add(item.name || item.title, `${resource}:${item.id}`, `${path}/${item.id}`);
    }
  }

  // Entités des mods actifs dans l'univers
  const enabledMods = universe.mods || {};
  if (Object.values(enabledMods).some(Boolean)) {
    const mods = await queryClient.ensureQueryData({ queryKey: ['mods'], queryFn: modsApi.list });
    const typePaths = new Map();
    for (const mod of mods || []) {
      if (enabledMods[mod.id] !== true) continue;
      for (const t of mod.entityTypes || []) typePaths.set(`${mod.id}.${t.key}`, `mods/${mod.id}/${t.path}`);
    }
    if (typePaths.size) {
      for (const e of await list('customEntities')) {
        const base = typePaths.get(`${e.modId}.${e.typeKey}`);
        if (base) add(e.name, `customEntities:${e.id}`, `${base}/${e.id}`);
      }
    }
  }

  // Noms ambigus (plusieurs entités différentes) : ignorés
  const byName = new Map();
  const ambiguous = new Set();
  for (const [name, target] of candidates) {
    const known = byName.get(name);
    if (known && known.key !== target.key) ambiguous.add(name);
    else byName.set(name, target);
  }
  for (const name of ambiguous) byName.delete(name);
  if (!byName.size) return null;

  // Noms les plus longs d'abord : « Lucas Martin » avant « Lucas »
  const names = [...byName.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp);
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])(?:${names.join('|')})(?![\\p{L}\\p{N}_])`, 'gu');
  return { pattern, byName };
}

/**
 * Ajoute les liens dans un texte riche (HTML). `selfKey` : « ressource:id » de la fiche, jamais liée à elle-même.
 * Renvoie le HTML d'origine (même chaîne) si rien n'a changé.
 */
export function linkEntities(html, targets, selfKey = null) {
  if (!html || !targets || typeof html !== 'string') return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const nodes = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    // Pas dans un lien existant ni dans du code
    if (!node.parentElement?.closest(SKIPPED)) nodes.push(node);
  }

  let changed = false;
  for (const node of nodes) {
    const text = node.data;
    targets.pattern.lastIndex = 0;
    let last = 0;
    let fragment = null;
    for (const match of text.matchAll(targets.pattern)) {
      const target = targets.byName.get(match[0]);
      if (!target || target.key === selfKey) continue;
      fragment ??= doc.createDocumentFragment();
      if (match.index > last) fragment.append(text.slice(last, match.index));
      const link = doc.createElement('a');
      link.href = target.href;
      link.textContent = match[0];
      fragment.append(link);
      last = match.index + match[0].length;
    }
    if (!fragment) continue;
    if (last < text.length) fragment.append(text.slice(last));
    node.replaceWith(fragment);
    changed = true;
  }
  return changed ? doc.body.innerHTML : html;
}

/** Valeurs d'une fiche avec ses champs riches liés (copie ; `values` inchangé). */
export function linkValues(values, resource, targets, selfKey) {
  const fields = RICH_FIELDS[resource];
  if (!fields || !targets) return values;
  const next = { ...values };
  for (const field of fields) if (typeof next[field] === 'string') next[field] = linkEntities(next[field], targets, selfKey);
  return next;
}

/**
 * À l'enregistrement d'une fiche : ses champs riches avec les liens. Ne bloque jamais l'enregistrement :
 * en cas d'erreur (liste indisponible…), les valeurs sont renvoyées telles quelles.
 * `universeId` : celui des valeurs (universe_id) à défaut.
 */
export async function autoLinkValues(queryClient, resource, values, { id = null, universeId = values?.universe_id } = {}) {
  if (!RICH_FIELDS[resource] || !universeId) return values;
  if (!RICH_FIELDS[resource].some((f) => typeof values[f] === 'string' && values[f])) return values;
  try {
    const targets = await loadLinkTargets(queryClient, universeId);
    return linkValues(values, resource, targets, id ? `${resource}:${id}` : null);
  } catch (err) {
    console.warn('Liens automatiques ignorés :', err);
    return values;
  }
}

/**
 * Toutes les fiches de l'univers : ajoute les liens dans leurs champs riches (formes des personnages comprises)
 * et n'enregistre que les champs modifiés. `onProgress({ done, total })`. Renvoie { fields, entities }.
 */
export async function linkUniverse(queryClient, universeId, { onProgress } = {}) {
  const targets = await loadLinkTargets(queryClient, universeId);
  if (!targets) return { fields: 0, entities: 0 };
  const updates = [];
  const touched = new Set();
  const collect = (resource, entity, selfKey, record = resource) => {
    for (const field of RICH_FIELDS[resource]) {
      const html = entity[field];
      if (typeof html !== 'string' || !html) continue;
      const linked = linkEntities(html, targets, selfKey);
      if (linked !== html) {
        updates.push({ resource: record, id: entity.id, field, html: linked });
        touched.add(selfKey);
      }
    }
  };

  const resources = Object.keys(RICH_FIELDS);
  let done = 0;
  const lists = await Promise.all(resources.map((r) => RESOURCES[r].list(universeId).catch(() => [])));
  const total = lists.reduce((n, l) => n + l.length, 0);
  for (const [i, resource] of resources.entries()) {
    for (const item of lists[i]) {
      // Champs riches absents de la liste, ou formes de personnage (allégées dans la liste) : fiche complète
      const incomplete = RICH_FIELDS[resource].some((f) => !(f in item)) || (resource === 'characters' && item.forms?.length);
      const entity = incomplete ? await RESOURCES[resource].get(item.id) : item;
      const selfKey = `${resource}:${entity.id}`;
      collect(resource, entity, selfKey);
      if (resource === 'characters') for (const form of entity.forms || []) collect('characters', form, selfKey, 'characterForms');
      onProgress?.({ done: ++done, total });
    }
  }

  // Envoi par lots (corps limité côté serveur)
  for (let i = 0; i < updates.length; i += 100) {
    await request(`/universes/${universeId}/rich-links`, { method: 'POST', body: { updates: updates.slice(i, i + 100) } });
  }
  return { fields: updates.length, entities: touched.size };
}
