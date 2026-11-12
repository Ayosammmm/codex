import { SORTS, characterName } from '@/config/characters';
import { groupItems, useListState } from '@/components/entity/useListState';

const OPTIONS = {
  sorts: SORTS,
  views: ['gallery', 'cards', 'table'],
  storageKey: 'almanach:characters-view',
  searchText: (c) => [characterName(c), c.title, ...(c.groups || []).map((g) => g.name), ...(c.species || []).map((s) => s.name)].join(' '),
};

/** Tris disponibles selon les modules actifs (ex. pas de tri par rang sans le module Rangs). */
export const characterSorts = (modules) => SORTS.filter((s) => !s.module || modules[s.module === 'powerRanks' ? 'ranks' : s.module]);

/** État de la liste des personnages (recherche, tri, filtres, vue) : voir useListState. */
export const useCharacterList = (characters, criteria, sorts = SORTS) => useListState(characters, { ...OPTIONS, sorts, criteria });

/** Répartit les personnages selon un critère (« Espèce non renseignée »...). */
export const groupCharacters = (characters, criterion, options) =>
  groupItems(characters, { ...criterion, noneLabel: `${criterion.label} non renseigné${criterion.key === 'species' ? 'e' : ''}` }, options);
