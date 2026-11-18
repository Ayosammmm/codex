import { useMemo } from 'react';
import { IMG, uploadUrl } from '@/api/client';
import { useEntityList } from '@/api/queries';
import { characterName } from '@/config/characters';
import { CRITERIA } from '@/config/groups';

const toOptions = (items = [], extra) =>
  items.map((item) => ({ value: item.id, label: item.name, color: item.color || undefined, ...extra?.(item) }));

/** Données liées aux groupes d'un univers : groupes, types, personnages, lieux (options prêtes). */
export function useGroupReferences(universe) {
  const id = universe.id;
  const groups = useEntityList('groups', id);
  const groupTypes = useEntityList('groupTypes', id);
  const characters = useEntityList('characters', id);
  const places = useEntityList('places', id);

  const options = useMemo(
    () => ({
      groupTypes: toOptions(groupTypes.data),
      groups: toOptions([...(groups.data || [])].sort((a, b) => a.name.localeCompare(b.name, 'fr')), (g) => ({ image: uploadUrl(g.image, IMG.thumb) })),
      places: toOptions(places.data),
      characters: (characters.data || [])
        .map((c) => ({ value: c.id, label: characterName(c), description: c.title || undefined, image: uploadUrl(c.avatar, IMG.thumb) }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    }),
    [groups.data, groupTypes.data, places.data, characters.data],
  );

  // Critères disponibles (au moins une valeur)
  const criteria = useMemo(
    () => CRITERIA.map((c) => ({ ...c, options: options[c.resource] || [] })).filter((c) => c.options.length > 0),
    [options],
  );

  return { groups, characters, options, criteria };
}
