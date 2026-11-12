import { uploadUrl } from '@/api/client';
import { characterName } from '@/config/characters';

// --- Tris (clé d'URL → comparaison) ---
const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
const byText = (get) => (a, b) => collator.compare(get(a) || '￿', get(b) || '￿');
const byNumberDesc = (get) => (a, b) => get(b) - get(a);

export const memberCount = (s) => s.characters?.length || 0;
export const childCount = (s) => s.children?.length || 0;
export const specieImage = (s) => uploadUrl(s?.image);

/** Personnages d'une espèce, par nom (les `max` premiers). */
export const specieMembers = (s, max) =>
  [...(s.characters || [])].sort((a, b) => characterName(a).localeCompare(characterName(b), 'fr')).slice(0, max);

export const SORTS = [
  { key: 'name', label: 'Nom', compare: byText((s) => s.name) },
  { key: 'parent', label: 'Espèce parente', compare: byText((s) => s.parent?.name) },
  { key: 'members', label: 'Nombre de personnages', compare: byNumberDesc(memberCount) },
  { key: 'children', label: 'Nombre de sous-espèces', compare: byNumberDesc(childCount) },
];

export const CRITERIA = [
  { key: 'parent', label: 'Espèce parente', resource: 'species', values: (s) => [s.parentId], noneLabel: 'Sans espèce parente' },
];

export const searchText = (s) => [s.name, s.parent?.name, ...(s.characters || []).map(characterName)].join(' ');
