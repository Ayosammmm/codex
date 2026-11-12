/**
 * Client HTTP minimal. Les URLs sont relatives : en développement, Vite relaie
 * /api et /uploads vers le backend (voir vite.config.js).
 */
export const API_BASE = import.meta.env.VITE_API_BASE || '/api';
export const UPLOADS_BASE = import.meta.env.VITE_UPLOADS_BASE || '';

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// --- Session : jeton de connexion (voir AuthProvider) ---
const TOKEN_KEY = 'almanach.token';
let token = null;
try {
  token = localStorage.getItem(TOKEN_KEY);
} catch {
  /* stockage indisponible : connexion le temps de l'onglet */
}

export const getToken = () => token;
export function setToken(value) {
  token = value || null;
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* idem */
  }
}

/** Appelé quand le serveur refuse la session (jeton expiré ou compte supprimé). */
let onUnauthorized = () => {};
export const setUnauthorizedHandler = (handler) => {
  onUnauthorized = handler;
};

const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

export async function request(path, { method = 'GET', body, headers, ...rest } = {}) {
  const isJson = body !== undefined && !(body instanceof FormData) && !(body instanceof Blob);
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    headers: { ...(isJson ? { 'Content-Type': 'application/json' } : {}), ...authHeaders(), ...headers },
    body: isJson ? JSON.stringify(body) : body,
    ...rest,
  });

  const data = response.headers.get('content-type')?.includes('application/json')
    ? await response.json().catch(() => null)
    : null;

  if (response.status === 401 && token && path !== '/auth/login') onUnauthorized();
  if (!response.ok) {
    const message =
      data?.error ||
      (response.status === 413 ? 'Fichier trop volumineux.' : `Erreur ${response.status} : le serveur n’a pas pu traiter la demande.`);
    throw new ApiError(message, response.status);
  }
  return data;
}

/** Télécharge un fichier de l'API (avec la session) sous le nom donné par le serveur. */
export async function download(path, fallbackName) {
  const response = await fetch(`${API_BASE}${path}`, { headers: authHeaders() });
  if (response.status === 401 && token) onUnauthorized();
  if (!response.ok) throw new ApiError(`Erreur ${response.status} : téléchargement impossible.`, response.status);
  const name = /filename="?([^";]+)"?/.exec(response.headers.get('content-disposition') || '')?.[1] || fallbackName;
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = decodeURIComponent(name);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** URL affichable d'un fichier envoyé (/uploads/...) ou d'une URL externe. */
export const uploadUrl = (path) => {
  if (!path) return null;
  return /^https?:\/\//.test(path) ? path : `${UPLOADS_BASE}${path}`;
};
