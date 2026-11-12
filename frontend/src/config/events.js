import { uploadUrl } from '@/api/client';
import { characterName } from '@/config/characters';

// --- Importance d'un événement (de la moins à la plus importante) ---
export const IMPORTANCE = [
  { value: 'Mineure', label: 'Mineure', color: '#64748b' },
  { value: 'Notable', label: 'Notable', color: '#0891b2' },
  { value: 'Majeure', label: 'Majeure', color: '#d97706' },
  { value: 'Capitale', label: 'Capitale', color: '#dc2626' },
];
export const importanceColor = (v) => IMPORTANCE.find((i) => i.value === v)?.color;
export const eventImage = (e) => uploadUrl(e?.image);

/** Histoires où apparaît un événement (via ses épisodes), sans doublon. */
export function eventStories(event) {
  const byId = new Map();
  for (const ep of event?.episodes || []) for (const s of ep.stories || []) byId.set(s.id, s);
  return [...byId.values()];
}

// --- Tris et critères de l'archive ---
const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
const byText = (get) => (a, b) => collator.compare(get(a) || '￿', get(b) || '￿');
const byNumber = (get) => (a, b) => (get(a) ?? Infinity) - (get(b) ?? Infinity);

export const SORTS = [
  // Chronologie : ordre réglé dans la frise
  { key: 'chrono', label: 'Chronologie', compare: byNumber((e) => e.order) },
  { key: 'name', label: 'Nom', compare: byText((e) => e.name) },
  { key: 'importance', label: 'Importance', compare: byNumber((e) => (e.importance ? -IMPORTANCE.findIndex((i) => i.value === e.importance) : undefined)) },
];

export const CRITERIA = [
  { key: 'importance', label: 'Importance', options: [...IMPORTANCE].reverse(), values: (e) => [e.importance] },
  { key: 'story', label: 'Histoire', resource: 'stories', values: (e) => eventStories(e).map((s) => s.id), noneLabel: 'Hors histoire' },
  { key: 'character', label: 'Personnage', resource: 'characters', values: (e) => e.characters?.map((c) => c.id) || [], noneLabel: 'Sans personnage' },
  { key: 'place', label: 'Lieu', resource: 'places', values: (e) => e.places?.map((p) => p.id) || [], noneLabel: 'Sans lieu' },
  { key: 'group', label: 'Groupe', resource: 'groups', module: 'groups', values: (e) => e.groups?.map((g) => g.id) || [], noneLabel: 'Sans groupe' },
];

export const searchText = (e) =>
  [e.name, e.date, e.importance, ...(e.characters || []).map(characterName), ...(e.places || []).map((p) => p.name), ...eventStories(e).map((s) => s.name)].join(' ');
