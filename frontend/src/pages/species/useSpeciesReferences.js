import { useMemo } from 'react';
import { uploadUrl } from '@/api/client';
import { useEntityList } from '@/api/queries';
import { characterName } from '@/config/characters';
import { CRITERIA } from '@/config/species';

const byLabel = (a, b) => a.label.localeCompare(b.label, 'fr');

/** Données liées aux espèces d'un univers : espèces et personnages (options prêtes). */
export function useSpeciesReferences(universe) {
  const species = useEntityList('species', universe.id);
  const characters = useEntityList('characters', universe.id);

  const options = useMemo(
    () => ({
      species: (species.data || []).map((s) => ({ value: s.id, label: s.name, description: s.parent?.name, image: uploadUrl(s.image) })).sort(byLabel),
      characters: (characters.data || [])
        .map((c) => ({ value: c.id, label: characterName(c), description: c.title || undefined, image: uploadUrl(c.avatar) }))
        .sort(byLabel),
    }),
    [species.data, characters.data],
  );

  const criteria = useMemo(
    () => CRITERIA.map((c) => ({ ...c, options: options[c.resource] || [] })).filter((c) => c.options.length > 0),
    [options],
  );

  return { species, characters, options, criteria };
}
