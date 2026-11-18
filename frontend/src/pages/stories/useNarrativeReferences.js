import { useMemo } from 'react';
import { IMG, uploadUrl } from '@/api/client';
import { useEntityList } from '@/api/queries';
import { characterName } from '@/config/characters';
import { getModulesState, isModuleEnabled } from '@/config/modules';

const byLabel = (a, b) => a.label.localeCompare(b.label, 'fr');

/**
 * Données utiles aux histoires, épisodes et événements d'un univers (options prêtes).
 * Les groupes et les événements ne sont chargés que si leur module est actif.
 */
export function useNarrativeReferences(universe) {
  const state = getModulesState(universe);
  const modules = { groups: isModuleEnabled(state, 'groups'), events: isModuleEnabled(state, 'events'), roleplay: isModuleEnabled(state, 'roleplay') };
  const id = universe.id;

  const stories = useEntityList('stories', id);
  const episodes = useEntityList('episodes', id);
  const events = useEntityList('events', id, { enabled: modules.events });
  const characters = useEntityList('characters', id);
  const places = useEntityList('places', id);
  const groups = useEntityList('groups', id, { enabled: modules.groups });

  const options = useMemo(
    () => ({
      characters: (characters.data || [])
        .map((c) => ({ value: c.id, label: characterName(c), description: c.title || undefined, image: uploadUrl(c.avatar, IMG.thumb) }))
        .sort(byLabel),
      places: (places.data || []).map((p) => ({ value: p.id, label: p.name, description: p.parent?.name })).sort(byLabel),
      groups: (groups.data || []).map((g) => ({ value: g.id, label: g.name, image: uploadUrl(g.image, IMG.thumb) })).sort(byLabel),
      stories: (stories.data || []).map((s) => ({ value: s.id, label: s.name })).sort(byLabel),
      // Épisodes : « Titre », avec leur histoire en précision
      episodes: (episodes.data || [])
        .map((e) => ({ value: e.id, label: e.title, description: e.stories?.map((s) => s.name).join(', ') || 'Hors histoire' }))
        .sort(byLabel),
      events: (events.data || []).map((e) => ({ value: e.id, label: e.name, description: e.date || undefined })),
    }),
    [characters.data, places.data, groups.data, stories.data, episodes.data, events.data],
  );

  return { stories, episodes, events, characters, options, modules };
}
