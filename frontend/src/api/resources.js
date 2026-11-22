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
  collections: createResource('/collections'),
  // Entités des types déclarés par les mods (toutes celles de l'univers ; filtrées par modId / typeKey)
  customEntities: createResource('/custom-entities'),
};

/** Autres formes d'un personnage : chaque appel renvoie la fiche complète du personnage. */
export const characterFormsApi = {
  create: (characterId, data = {}) => request(`/characters/${characterId}/forms`, { method: 'POST', body: data }),
  update: (characterId, formId, data) => request(`/characters/${characterId}/forms/${formId}`, { method: 'PUT', body: data }),
  remove: (characterId, formId) => request(`/characters/${characterId}/forms/${formId}`, { method: 'DELETE' }),
  /** `ids` : formes d'un même type, dans le nouvel ordre (époques : de la plus ancienne à la plus récente). */
  reorder: (characterId, ids) => request(`/characters/${characterId}/forms/reorder`, { method: 'PUT', body: { ids } }),
  /** Faire évoluer : la forme par défaut devient l’époque la plus récente (avec ses images), puis perd ses images. */
  evolve: (characterId, data = {}) => request(`/characters/${characterId}/forms/evolve`, { method: 'POST', body: data }),
  uploadFile: (characterId, formId, field, file) => {
    const form = new FormData();
    form.append(field, file);
    return request(`/characters/${characterId}/forms/${formId}/${field}`, { method: 'POST', body: form });
  },
  deleteFile: (characterId, formId, field) => request(`/characters/${characterId}/forms/${formId}/${field}`, { method: 'DELETE' }),
};

/** Albums photo (personnages, créatures, lieux, groupes, espèces, entités de mods). */
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
