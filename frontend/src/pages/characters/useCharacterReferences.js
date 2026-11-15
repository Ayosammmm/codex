import { useMemo } from 'react';
import { useEntityList } from '@/api/queries';
import { uploadUrl } from '@/api/client';
import { CRITERIA, characterName } from '@/config/characters';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { groupRoles } from '@/config/groups';

const toOptions = (items = [], extra) =>
  items.map((item) => ({ value: item.id, label: item.name, color: item.color || undefined, ...extra?.(item) }));

/**
 * Référentiels et entités liées aux personnages d'un univers, sous forme d'options prêtes
 * pour les listes déroulantes. Les modules désactivés ne sont pas chargés.
 */
export function useCharacterReferences(universe) {
  const modules = getModulesState(universe);
  const on = (key) => isModuleEnabled(modules, key);
  const id = universe.id;

  const genders = useEntityList('genders', id);
  const statuses = useEntityList('statuses', id);
  const alignments = useEntityList('alignments', id);
  const powerRanks = useEntityList('powerRanks', id, { enabled: on('powerRanks') });
  const groups = useEntityList('groups', id, { enabled: on('groups') });
  const species = useEntityList('species', id, { enabled: on('species') });
  const places = useEntityList('places', id);
  const characters = useEntityList('characters', id);

  const data = {
    genders: genders.data,
    statuses: statuses.data,
    alignments: alignments.data,
    powerRanks: powerRanks.data,
    groups: groups.data,
    species: species.data,
    places: places.data,
  };

  const options = useMemo(
    () => ({
      genders: toOptions(data.genders),
      statuses: toOptions(data.statuses),
      alignments: toOptions(data.alignments),
      powerRanks: toOptions(data.powerRanks),
      // Chaque groupe porte ses rôles (choix du rôle du personnage) et de quoi afficher son logo
      groups: toOptions(data.groups, (g) => ({ roles: groupRoles(g), group: g })),
      species: toOptions(data.species),
      places: toOptions(data.places),
      characters: (characters.data || [])
        .map((c) => ({ value: c.id, label: characterName(c), description: c.title || undefined, image: uploadUrl(c.avatar) }))
        .sort((a, b) => a.label.localeCompare(b.label, 'fr')),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [genders.data, statuses.data, alignments.data, powerRanks.data, groups.data, species.data, places.data, characters.data],
  );

  // Critères de filtre / regroupement disponibles (module actif et au moins une valeur)
  const criteria = useMemo(
    () =>
      CRITERIA.filter((c) => !c.module || on(c.module))
        .map((c) => ({ ...c, options: options[c.resource] || [] }))
        .filter((c) => c.options.length > 0),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [options, universe],
  );

  return {
    options,
    criteria,
    modules: { groups: on('groups'), species: on('species'), personality: on('personality'), relations: on('relations'), powers: on('powers'), ranks: on('powerRanks') },
    characters,
  };
}
