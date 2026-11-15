import { useMemo, useState } from 'react';
import { useEntityList } from '@/api/queries';
import { useCollectionLinks } from '@/api/collections';
import { getModulesState, isModuleEnabled } from '@/config/modules';
import { CollectionFilterContext } from './collectionFilter';

// Filtre mémorisé par univers sur l'appareil
const storageKey = (universeId) => `almanach.collectionFilter.${universeId}`;
const readStored = (universeId) => {
  try {
    return localStorage.getItem(storageKey(universeId)) || '';
  } catch {
    return '';
  }
};
const writeStored = (universeId, value) => {
  try {
    if (value) localStorage.setItem(storageKey(universeId), value);
    else localStorage.removeItem(storageKey(universeId));
  } catch {
    /* filtre le temps de la visite */
  }
};

/** Fournit le filtre de collection aux pages d'un univers (à remonter avec `key={universe.id}`). */
export function CollectionFilterProvider({ universe, children }) {
  const enabled = isModuleEnabled(getModulesState(universe), 'collections');
  const universeId = universe.id;
  const { data: collectionsData } = useEntityList('collections', universeId, { enabled });
  const { data: linksData } = useCollectionLinks(universeId, { enabled });
  const [stored, setStored] = useState(() => readStored(universeId));

  const value = useMemo(() => {
    const list = collectionsData || [];
    const current = list.find((c) => String(c.id) === stored) || null;
    // Filtre ignoré tant que les liens ne sont pas chargés, ou si la collection n'existe plus
    const filter = enabled && linksData && (stored === 'none' || current) ? stored : '';

    const byEntity = new Map();
    for (const l of linksData || []) {
      const key = `${l.entityType}:${l.entityId}`;
      if (!byEntity.has(key)) byEntity.set(key, []);
      byEntity.get(key).push(l.collectionId);
    }
    const collectionIdsOf = (type, id) => byEntity.get(`${type}:${id}`) || [];

    const matches = (type, id) => {
      if (!filter) return true;
      const ids = collectionIdsOf(type, id);
      return filter === 'none' ? ids.length === 0 : ids.includes(Number(filter));
    };

    const count = (type, total) => {
      if (!filter || total == null) return total;
      const linked = new Set((linksData || []).filter((l) => l.entityType === type).map((l) => l.entityId));
      if (filter === 'none') return Math.max(0, total - linked.size);
      return (linksData || []).filter((l) => l.entityType === type && l.collectionId === Number(filter)).length;
    };

    const setFilter = (next) => {
      writeStored(universeId, next);
      setStored(next);
    };

    return { enabled, filter, current: filter && filter !== 'none' ? current : null, collections: list, setFilter, matches, collectionIdsOf, count };
  }, [enabled, collectionsData, linksData, stored, universeId]);

  return <CollectionFilterContext value={value}>{children}</CollectionFilterContext>;
}
