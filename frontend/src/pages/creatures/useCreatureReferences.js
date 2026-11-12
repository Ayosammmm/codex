import { useMemo } from 'react';
import { useEntityList } from '@/api/queries';
import { CRITERIA } from '@/config/creatures';
import { getModulesState, isModuleEnabled } from '@/config/modules';

const toOptions = (items = []) => items.map((i) => ({ value: i.id, label: i.name, color: i.color || undefined }));

/** Données liées au bestiaire d'un univers : créatures, rangs et lieux (options prêtes). */
export function useCreatureReferences(universe) {
  const creatures = useEntityList('creatures', universe.id);
  const ranks = isModuleEnabled(getModulesState(universe), 'powerRanks');
  const powerRanks = useEntityList('powerRanks', universe.id, { enabled: ranks });
  const places = useEntityList('places', universe.id);

  const options = useMemo(
    () => ({
      powerRanks: toOptions(powerRanks.data),
      places: toOptions(places.data).sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    }),
    [powerRanks.data, places.data],
  );

  const criteria = useMemo(
    () =>
      CRITERIA.filter((c) => ranks || c.module !== 'powerRanks')
        .map((c) => ({ ...c, options: c.options || options[c.resource] || [] }))
        .filter((c) => c.options.length > 0),
    [options, ranks],
  );

  return { creatures, options, criteria, modules: { ranks } };
}
