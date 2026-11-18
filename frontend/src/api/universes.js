import { download, request } from './client';

export const UNIVERSE_IMAGE_FIELDS = ['logo', 'banner', 'background'];

export const universesApi = {
  list: ({ stats = false } = {}) => request(`/universes${stats ? '?stats=1' : ''}`),
  get: (id) => request(`/universes/${id}`),
  create: (data) => request('/universes', { method: 'POST', body: data }),
  update: (id, data) => request(`/universes/${id}`, { method: 'PUT', body: data }),
  remove: (id) => request(`/universes/${id}`, { method: 'DELETE' }),
  duplicate: (id, name) => request(`/universes/${id}/duplicate`, { method: 'POST', body: { name } }),

  uploadImage: (id, field, file) => {
    const form = new FormData();
    form.append(field, file);
    return request(`/universes/${id}/${field}`, { method: 'POST', body: form });
  },
  deleteImage: (id, field) => request(`/universes/${id}/${field}`, { method: 'DELETE' }),

  /** Archive .zip (ou ancien export .json) envoyée telle quelle : le serveur détecte le format. */
  importFile: (file) =>
    request('/universes/import', { method: 'POST', body: file, headers: { 'Content-Type': 'application/octet-stream' } }),

  /** URL de téléchargement (le serveur renvoie un en-tête Content-Disposition). */
  exportFile: (id) => download(`/universes/${id}/export`, `univers-${id}.codex.zip`),
};
