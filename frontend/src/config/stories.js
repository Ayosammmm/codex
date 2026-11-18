import { uploadUrl } from '@/api/client';
import { characterName } from '@/config/characters';

// --- Place d'un personnage dans un épisode (du plus important au moins important) ---
export const EPISODE_ROLES = [
  { value: 'principal', label: 'Principal', plural: 'Personnages principaux' },
  { value: 'secondaire', label: 'Secondaire', plural: 'Personnages secondaires' },
  { value: 'spectateur', label: 'Spectateur', plural: 'Spectateurs' },
];
export const DEFAULT_EPISODE_ROLE = 'secondaire';
export const episodeRole = (c) => c?.EpisodeCharacter?.role || DEFAULT_EPISODE_ROLE;
const roleRank = (role) => EPISODE_ROLES.findIndex((r) => r.value === role);

export const storyImage = (s, size) => uploadUrl(s?.image, size);

/** Fond d'un épisode : le sien (image ou couleur), sinon celui de son histoire. */
export const episodeBackdrop = (episode, story) =>
  episode?.background || episode?.backgroundColor
    ? { background: uploadUrl(episode.background), backgroundColor: episode.backgroundColor }
    : { background: uploadUrl(story?.background), backgroundColor: story?.backgroundColor };
export const episodeCount = (s) => s.episodes?.length || 0;
/** Période d'une histoire : « Début → Fin », l'un ou l'autre, ou null. */
export const storyPeriod = (s) => [s?.startDate, s?.endDate].filter(Boolean).join(' → ') || null;
/** Épisodes d'une histoire dans l'ordre. */
export const sortedEpisodes = (s) => [...(s?.episodes || [])].sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || a.id - b.id);

/**
 * Personnages d'une histoire (tous ses épisodes), sans doublon : rôle le plus important tenu
 * et nombre d'épisodes. Triés par rôle puis par nombre d'apparitions.
 */
export function storyCharacters(story) {
  const byId = new Map();
  for (const ep of story?.episodes || []) {
    for (const c of ep.characters || []) {
      const role = episodeRole(c);
      const entry = byId.get(c.id) || { ...c, role, appearances: 0 };
      if (roleRank(role) < roleRank(entry.role)) entry.role = role;
      entry.appearances += 1;
      byId.set(c.id, entry);
    }
  }
  return [...byId.values()].sort(
    (a, b) => roleRank(a.role) - roleRank(b.role) || b.appearances - a.appearances || characterName(a).localeCompare(characterName(b), 'fr'),
  );
}

/** Éléments liés à une histoire via ses épisodes (lieux, événements), sans doublon. */
export const storyLinked = (story, key) => {
  const byId = new Map();
  for (const ep of story?.episodes || []) for (const item of ep[key] || []) byId.set(item.id, item);
  return [...byId.values()];
};

// --- Tris et critères de l'archive ---
const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
const byText = (get) => (a, b) => collator.compare(get(a) || '￿', get(b) || '￿');
const byNumberDesc = (get) => (a, b) => get(b) - get(a);

export const SORTS = [
  { key: 'name', label: 'Nom', compare: byText((s) => s.name) },
  { key: 'episodes', label: 'Nombre d’épisodes', compare: byNumberDesc(episodeCount) },
  { key: 'characters', label: 'Nombre de personnages', compare: byNumberDesc((s) => storyCharacters(s).length) },
];

export const CRITERIA = [
  { key: 'character', label: 'Personnage', resource: 'characters', values: (s) => storyCharacters(s).map((c) => c.id), noneLabel: 'Sans personnage' },
];

export const searchText = (s) =>
  [s.name, s.startDate, s.endDate, ...(s.episodes || []).map((e) => e.title), ...storyCharacters(s).map(characterName)].join(' ');
