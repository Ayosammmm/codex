import { request } from './client';

/**
 * API REST générique d'une entité d'univers (personnages, lieux, genres...).
 * Toutes les listes sont filtrées par univers via `?universe_id=`.
 */
export const createResource = (path) => ({
  list: (universeId) => request(`${path}?universe_id=${universeId}`),
  get: (id) => request(`${path}/${id}`),
  create: (data) => request(path, { method: 'POST', body: data }),
  update: (id, data) => request(`${path}/${id}`, { method: 'PUT', body: data }),
  remove: (id) => request(`${path}/${id}`, { method: 'DELETE' }),
  uploadImage: (id, field, file) => {
    const form = new FormData();
    form.append(field, file);
    return request(`${path}/${id}/${field}`, { method: 'POST', body: form });
  },
  deleteImage: (id, field) => request(`${path}/${id}/${field}`, { method: 'DELETE' }),
  // Référentiels : nouvel ordre d'affichage
  reorder: (ids) => request(`${path}/reorder`, { method: 'PUT', body: { ids } }),
});

/** Ressources par clé (la clé sert aussi de clé de cache React Query). */
export const RESOURCES = {
  characters: createResource('/characters'),
  places: createResource('/places'),
  groups: createResource('/groups'),
  species: createResource('/species'),
  creatures: createResource('/creatures'),
  stories: createResource('/stories'),
  episodes: createResource('/episodes'),
  events: createResource('/events'),
  genders: createResource('/genders'),
  statuses: createResource('/statuses'),
  alignments: createResource('/alignments'),
  powerRanks: createResource('/power-ranks'),
  placeTypes: createResource('/places_type'),
  groupTypes: createResource('/groups_type'),
};

/** Albums photo (personnages, créatures, lieux, groupes). */
export const photosApi = {
  list: (entityType, entityId) => request(`/entity-photos/${entityType}/${entityId}`),
  upload: (entityType, entityId, file) => {
    const form = new FormData();
    form.append('photo', file);
    return request(`/entity-photos/${entityType}/${entityId}`, { method: 'POST', body: form });
  },
  update: (photoId, data) => request(`/entity-photos/${photoId}`, { method: 'PUT', body: data }),
  remove: (photoId) => request(`/entity-photos/${photoId}`, { method: 'DELETE' }),
};
