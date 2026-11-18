import { useMemo } from 'react';
import { IMG, uploadUrl } from '@/api/client';
import { useEntityList } from '@/api/queries';
import { characterName } from '@/config/characters';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { CRITERIA } from '@/config/places';

const byLabel = (a, b) => a.label.localeCompare(b.label, 'fr');
const toOptions = (items = [], extra) =>
  items.map((item) => ({ value: item.id, label: item.name, color: item.color || undefined, ...extra?.(item) })).sort(byLabel);

/** Données liées aux lieux d'un univers : lieux, types, personnages, groupes (options prêtes). */
export function usePlaceReferences(universe) {
  const id = universe.id;
  const groupsOn = isModuleEnabled(getModulesState(universe), 'groups');
  const mapOn = isModuleEnabled(getModulesState(universe), 'map');
  const places = useEntityList('places', id);
  const placeTypes = useEntityList('placeTypes', id);
  const characters = useEntityList('characters', id);
  const groups = useEntityList('groups', id, { enabled: groupsOn });

  const options = useMemo(
    () => ({
      placeTypes: toOptions(placeTypes.data),
      places: toOptions(places.data, (p) => ({ description: p.parent?.name })),
      groups: toOptions(groups.data, (g) => ({ image: uploadUrl(g.image, IMG.thumb) })),
      characters: (characters.data || [])
        .map((c) => ({ value: c.id, label: characterName(c), description: c.title || undefined, image: uploadUrl(c.avatar, IMG.thumb) }))
        .sort(byLabel),
    }),
    [places.data, placeTypes.data, groups.data, characters.data],
  );

  const criteria = useMemo(
    () =>
      CRITERIA.filter((c) => !c.module || (c.module === 'groups' && groupsOn))
        .map((c) => ({ ...c, options: options[c.resource] || [] }))
        .filter((c) => c.options.length > 0),
    [options, groupsOn],
  );

  return { places, characters, groups, options, criteria, modules: { groups: groupsOn, map: mapOn } };
}
