import { uploadUrl } from '@/api/client';

// --- Valeurs des listes (identiques au modèle du backend) ---
const toOptions = (values) => values.map((v) => ({ value: v, label: v }));

export const SIZE_UNITS = toOptions(['cm', 'm']);
export const ACTIVITY_CYCLES = toOptions(['Diurne', 'Nocturne', 'Crépusculaire', 'Variable']);
export const DIETS = toOptions(['Herbivore', 'Carnivore', 'Omnivore']);
export const TEMPERAMENTS = [
  { value: 'Pacifique', label: 'Pacifique', color: '#16a34a' },
  { value: 'Défensif', label: 'Défensif', color: '#ca8a04' },
  { value: 'Hostile', label: 'Hostile', color: '#ea580c' },
  { value: 'Prédateur', label: 'Prédateur', color: '#dc2626' },
];
export const FLIGHT_BEHAVIORS = [
  { value: 'Ne fuit pas', label: 'Ne fuit pas' },
  { value: 'fuit quand blessé', label: 'Fuit quand blessée' },
  { value: 'fuit constamment', label: 'Fuit constamment' },
];
export const INTELLIGENCE_MAX = 10;

export const temperamentColor = (t) => TEMPERAMENTS.find((o) => o.value === t)?.color;
export const flightLabel = (f) => FLIGHT_BEHAVIORS.find((o) => o.value === f)?.label || f;
export const creatureImage = (c) => uploadUrl(c?.image);
export const formatSize = (c) => (c?.averageSize ? `${c.averageSize} ${c.sizeUnit || 'cm'}` : null);
export const formatWeight = (c) => (c?.averageWeight != null ? `${String(c.averageWeight).replace('.', ',')} kg` : null);
export const formatLife = (c) => (c?.lifeExpectancy != null ? `${c.lifeExpectancy} an${c.lifeExpectancy > 1 ? 's' : ''}` : null);

// --- Tris (clé d'URL → comparaison) ---
const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
const byText = (get) => (a, b) => collator.compare(get(a) || '￿', get(b) || '￿');
const byNumber = (get) => (a, b) => (get(a) ?? Infinity) - (get(b) ?? Infinity);
const sizeInCm = (c) => {
  const n = parseFloat(String(c.averageSize || '').replace(',', '.'));
  return Number.isFinite(n) ? n * (c.sizeUnit === 'm' ? 100 : 1) : undefined;
};
const order = (options) => (value) => {
  const i = options.findIndex((o) => o.value === value);
  return i === -1 ? undefined : i;
};

export const SORTS = [
  { key: 'name', label: 'Nom', compare: byText((c) => c.name) },
  // Rang : dans l'ordre de la page « Rangs de puissance »
  { key: 'rank', label: 'Rang', module: 'powerRanks', compare: byNumber((c) => (c.powerRank ? (c.powerRank.position ?? c.powerRank.id) : undefined)) },
  { key: 'size', label: 'Taille', compare: byNumber(sizeInCm) },
  { key: 'temperament', label: 'Tempérament', compare: byNumber((c) => order(TEMPERAMENTS)(c.temperament)) },
  { key: 'intelligence', label: 'Intelligence', compare: (a, b) => (b.intelligence ?? -1) - (a.intelligence ?? -1) },
];

/** Critères de filtre / regroupement ; `options` fixes ou fournies par useCreatureReferences (`resource`). */
export const CRITERIA = [
  { key: 'rank', label: 'Rang', resource: 'powerRanks', module: 'powerRanks', values: (c) => [c.powerRank?.id ?? c.powerRankId] },
  { key: 'temperament', label: 'Tempérament', options: TEMPERAMENTS, values: (c) => [c.temperament] },
  { key: 'diet', label: 'Régime', options: DIETS, values: (c) => [c.diet] },
  { key: 'activity', label: 'Cycle d’activité', options: ACTIVITY_CYCLES, values: (c) => [c.activityCycle] },
  { key: 'habitat', label: 'Habitat', resource: 'places', values: (c) => c.habitats?.map((p) => p.id) || [], noneLabel: 'Habitat non renseigné' },
];

/** Tris et critères disponibles selon les modules actifs (`ranks` : module Rangs de puissance). */
export const creatureSorts = (ranks) => SORTS.filter((s) => ranks || s.module !== 'powerRanks');

export const searchText = (c) => [c.name, c.powerRank?.name, c.temperament, c.diet, ...(c.habitats || []).map((p) => p.name)].join(' ');
