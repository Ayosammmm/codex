import { useMemo } from 'react';
import { useEntityList } from '@/api/queries';
import { useEntityMetadata, useMods } from '@/api/mods';
import { ModsContext } from './modsContext';
import { modIcon } from './modIcons';

/** Fournit les mods actifs de l'univers à ses pages (à remonter avec `key={universe.id}`). */
export function ModsProvider({ universe, children }) {
  const { data: installed, isError } = useMods();

  const derived = useMemo(() => {
    const enabled = universe.mods || {};
    const activeMods = (installed || []).filter((m) => enabled[m.id] === true);
    const types = activeMods.flatMap((mod) =>
      mod.entityTypes.map((t) => ({
        ...t,
        id: `${mod.id}.${t.key}`,
        modId: mod.id,
        mod,
        statKey: `custom:${mod.id}.${t.key}`,
        basePath: `mods/${mod.id}/${t.path}`,
        Icon: modIcon(t.icon || mod.icon),
      })),
    );
    const pages = activeMods.flatMap((mod) =>
      mod.pages.map((p) => ({ ...p, id: `${mod.id}.${p.key}`, modId: mod.id, mod, basePath: `mods/${mod.id}/${p.path}`, Icon: modIcon(p.icon || mod.icon) })),
    );
    const fieldsByEntity = {};
    for (const mod of activeMods) {
      for (const [entityType, fields] of Object.entries(mod.fields || {})) {
        (fieldsByEntity[entityType] ||= []).push({ mod, fields });
      }
    }
    return { activeMods, types, pages, fieldsByEntity };
  }, [installed, universe.mods]);

  const hasTypes = derived.types.length > 0;
  const hasMetadata = Object.keys(derived.fieldsByEntity).length > 0;
  const custom = useEntityList('customEntities', universe.id, { enabled: hasTypes });
  const metadata = useEntityMetadata(universe.id, { enabled: hasMetadata });

  const value = useMemo(() => {
    const { activeMods, types, pages, fieldsByEntity } = derived;
    const typesById = new Map(types.map((t) => [t.id, t]));
    const byEntity = new Map((metadata.data || []).map((row) => [`${row.entityType}:${row.entityId}`, row.data || {}]));
    return {
      ready: Boolean(installed) || isError,
      installed: installed || [],
      activeMods,
      types,
      pages,
      customEntities: hasTypes ? custom.data || [] : [],
      customLoading: hasTypes && custom.isPending,
      fieldsFor: (entityType) => fieldsByEntity[entityType] || [],
      metadataOf: (entityType, id) => byEntity.get(`${entityType}:${Number(id)}`) || {},
      typeOf: (entity) => (entity ? typesById.get(`${entity.modId}.${entity.typeKey}`) || null : null),
      findTypeByPath: (modId, path) => types.find((t) => t.modId === modId && t.path === path) || null,
      findPageByPath: (modId, path) => pages.find((p) => p.modId === modId && p.path === path) || null,
    };
  }, [derived, installed, isError, hasTypes, custom.data, custom.isPending, metadata.data]);

  return <ModsContext value={value}>{children}</ModsContext>;
}
