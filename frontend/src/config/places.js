import { uploadUrl } from '@/api/client';
import { characterName } from '@/config/characters';

// --- Tris (clé d'URL → comparaison) ---
const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
const byText = (get) => (a, b) => collator.compare(get(a) || '￿', get(b) || '￿');
const byNumberDesc = (get) => (a, b) => get(b) - get(a);

export const nativeCount = (p) => p.characters?.length || 0;
export const childCount = (p) => p.children?.length || 0;

/** Image d'un lieu : sa bannière, sinon son image de fond. */
export const placeImage = (p) => uploadUrl(p?.banner) || uploadUrl(p?.background);

export const SORTS = [
  { key: 'name', label: 'Nom', compare: byText((p) => p.name) },
  { key: 'type', label: 'Type', compare: byText((p) => p.type?.name) },
  { key: 'parent', label: 'Lieu parent', compare: byText((p) => p.parent?.name) },
  { key: 'natives', label: 'Nombre d’originaires', compare: byNumberDesc(nativeCount) },
  { key: 'children', label: 'Nombre de sous-lieux', compare: byNumberDesc(childCount) },
];

/** Critères de filtre / regroupement (options fournies par usePlaceReferences). */
export const CRITERIA = [
  { key: 'type', label: 'Type', resource: 'placeTypes', values: (p) => [p.type?.id ?? p.placeTypeId] },
  { key: 'parent', label: 'Lieu parent', resource: 'places', values: (p) => [p.parentId], noneLabel: 'Sans lieu parent' },
  { key: 'group', label: 'Contrôlé par', resource: 'groups', module: 'groups', values: (p) => p.controllingGroups?.map((g) => g.id) || [], noneLabel: 'Contrôlé par personne' },
];

export const searchText = (p) =>
  [p.name, p.type?.name, p.parent?.name, ...(p.controllingGroups || []).map((g) => g.name), ...(p.characters || []).map(characterName)].join(' ');

/** Image de la carte d'un lieu (module Carte). */
export const placeMap = (p) => uploadUrl(p?.mapImage);

/** Repères de la carte d'un lieu : ses sous-lieux qui ont une position. */
export const mapPins = (place, places) =>
  places
    .filter((p) => p.parentId === place.id && p.mapX != null && p.mapY != null)
    .map((p) => ({ id: p.id, name: p.name, x: p.mapX, y: p.mapY, color: p.colors?.primary, hasMap: Boolean(p.mapImage) }));
