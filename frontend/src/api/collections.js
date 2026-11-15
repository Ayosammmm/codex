import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from './client';
import { entityKeys } from './queries';

/** Liens entité ↔ collection (module « Collections »). Le référentiel lui-même : RESOURCES.collections. */
export const collectionsApi = {
  links: (universeId) => request(`/collections/links?universe_id=${universeId}`),
  setLinks: (entityType, entityId, collectionIds) =>
    request(`/collections/links/${entityType}/${entityId}`, { method: 'PUT', body: { collectionIds } }),
};

// Rangée avec les entités : rafraîchie après chaque création / suppression d'entité ou de collection
const linksKey = (universeId) => entityKeys.list('collectionLinks', universeId);

/** Tous les liens d'un univers : [{ collectionId, entityType, entityId }]. */
export const useCollectionLinks = (universeId, { enabled = true } = {}) =>
  useQuery({
    queryKey: linksKey(universeId),
    queryFn: () => collectionsApi.links(universeId),
    enabled: enabled && Boolean(universeId),
  });

/** Remplace les collections d'une entité (enregistré immédiatement). */
export const useSetEntityCollections = (universeId, entityType, entityId) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (collectionIds) => collectionsApi.setLinks(entityType, entityId, collectionIds),
    onSuccess: (collectionIds) => {
      const id = Number(entityId);
      queryClient.setQueryData(linksKey(universeId), (links = []) => [
        ...links.filter((l) => !(l.entityType === entityType && l.entityId === id)),
        ...collectionIds.map((collectionId) => ({ collectionId, entityType, entityId: id })),
      ]);
    },
  });
};
