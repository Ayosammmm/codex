import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from './client';
import { entityKeys, universeKeys } from './queries';

/**
 * Modding (notes Obsidian « Modding ») :
 * - mods installés sur le serveur (super admins) ;
 * - métadonnées : champs ajoutés par les mods aux fiches de base ;
 * - enregistrements : données libres des pages de mods.
 * Les entités des types de mods passent par RESOURCES.customEntities (api/resources.js).
 */
export const modsApi = {
  list: () => request('/mods'),
  install: (file) => request('/mods', { method: 'POST', body: file, headers: { 'Content-Type': 'application/zip' } }),
  remove: (id) => request(`/mods/${id}`, { method: 'DELETE' }),
};

export const metadataApi = {
  list: (universeId) => request(`/entity-metadata?universe_id=${universeId}`),
  set: (entityType, entityId, modId, values) =>
    request(`/entity-metadata/${entityType}/${entityId}`, { method: 'PUT', body: { modId, values } }),
};

export const recordsApi = {
  list: (universeId, mod, collection, { summary = false } = {}) => {
    const params = new URLSearchParams({ universe_id: universeId, mod });
    if (collection) params.set('collection', collection);
    if (summary) params.set('summary', '1');
    return request(`/mod-records?${params}`);
  },
  get: (id) => request(`/mod-records/${id}`),
  create: (universeId, mod, collection, data) => request('/mod-records', { method: 'POST', body: { universe_id: universeId, mod, collection, data } }),
  update: (id, data) => request(`/mod-records/${id}`, { method: 'PUT', body: { data } }),
  remove: (id) => request(`/mod-records/${id}`, { method: 'DELETE' }),
};

const MODS_KEY = ['mods'];

/** Mods installés (manifestes normalisés par le serveur). */
export const useMods = () => useQuery({ queryKey: MODS_KEY, queryFn: modsApi.list, staleTime: 60_000 });

export const useInstallMod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file) => modsApi.install(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: MODS_KEY }),
  });
};

export const useRemoveMod = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => modsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: MODS_KEY });
      // Le mod est retiré des univers où il était actif
      queryClient.invalidateQueries({ queryKey: universeKeys.all });
    },
  });
};

// Rangées avec les entités : rafraîchies avec elles (création, suppression…)
const metadataKey = (universeId) => entityKeys.list('entityMetadata', universeId);

/** Métadonnées de toutes les fiches de l'univers : [{ entityType, entityId, data: { [modId]: { champ: valeur } } }]. */
export const useEntityMetadata = (universeId, { enabled = true } = {}) =>
  useQuery({
    queryKey: metadataKey(universeId),
    queryFn: () => metadataApi.list(universeId),
    enabled: enabled && Boolean(universeId),
  });

/** Enregistre les valeurs d'un mod sur une fiche (immédiatement, comme les collections). */
export const useSaveEntityMetadata = (universeId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ entityType, entityId, modId, values }) => metadataApi.set(entityType, entityId, modId, values),
    onSuccess: (row) => {
      queryClient.setQueryData(metadataKey(universeId), (rows = []) => [
        ...rows.filter((r) => !(r.entityType === row.entityType && r.entityId === row.entityId)),
        ...(Object.keys(row.data || {}).length ? [row] : []),
      ]);
    },
  });
};
