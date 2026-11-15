import { createContext, useContext } from 'react';

/** Types d'entités rangeables dans une collection, par clé de module (et de compteur de la sidebar). */
export const COLLECTION_ENTITY_TYPES = {
  characters: 'character',
  places: 'place',
  groups: 'group',
  species: 'specie',
  creatures: 'creature',
  stories: 'story',
  events: 'event',
};

const NO_FILTER = {
  enabled: false,
  filter: '',
  current: null,
  collections: [],
  setFilter: () => {},
  matches: () => true,
  collectionIdsOf: () => [],
  count: (_type, total) => total,
};

export const CollectionFilterContext = createContext(NO_FILTER);

/**
 * Filtre de collection de l'univers (choisi dans la sidebar) :
 * - `filter`  : '' (toutes), 'none' (sans collection) ou id de collection (chaîne)
 * - `matches(entityType, id)` : l'entité passe-t-elle le filtre ?
 * - `count(entityType, total)` : nombre d'entités du type qui passent le filtre
 */
export const useCollectionFilter = () => useContext(CollectionFilterContext);
