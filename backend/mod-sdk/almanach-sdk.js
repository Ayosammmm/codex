/**
 * SDK des pages de mods de l'Almanach (servi sur /mod-files/almanach-sdk.js).
 *
 *   <script src="/mod-files/almanach-sdk.js"></script>
 *   <script>
 *     Almanach.ready().then(async (ctx) => {
 *       const characters = await Almanach.entities.list('characters');
 *       await Almanach.records.create('parties', { score: 12 });
 *     });
 *   </script>
 *
 * La page tourne dans une iframe isolée (origine opaque) : elle n'a pas accès à la session.
 * Chaque appel passe par l'application (postMessage), qui l'exécute avec les droits de l'utilisateur.
 * Les couleurs et polices du thème de l'univers sont exposées en variables CSS (--bg, --fg, --primary…).
 */
(function () {
  'use strict';
  if (window.Almanach) return;

  let nextId = 1;
  const pending = new Map();
  const listeners = new Map();
  let context = null;
  let resolveReady;
  const readyPromise = new Promise((resolve) => {
    resolveReady = resolve;
  });

  const post = (message) => window.parent.postMessage({ source: 'almanach-mod', ...message }, '*');

  const call = (method, params) =>
    new Promise((resolve, reject) => {
      const id = nextId++;
      pending.set(id, { resolve, reject });
      post({ type: 'request', id, method, params });
    });

  const emit = (event, payload) => (listeners.get(event) || []).forEach((cb) => {
    try {
      cb(payload);
    } catch (error) {
      console.error(error);
    }
  });

  const applyTheme = (theme) => {
    if (!theme) return;
    const root = document.documentElement;
    for (const [name, value] of Object.entries(theme.vars || {})) root.style.setProperty(name, value);
    root.dataset.mode = theme.mode || 'light';
    root.dataset.theme = theme.key || 'almanach';
    root.style.colorScheme = theme.mode === 'dark' ? 'dark' : 'light';
  };

  window.addEventListener('message', (event) => {
    if (event.source !== window.parent) return;
    const message = event.data;
    if (!message || message.source !== 'almanach-host') return;
    if (message.type === 'init') {
      context = message.context;
      applyTheme(context.theme);
      resolveReady(context);
    } else if (message.type === 'theme') {
      if (context) context.theme = message.theme;
      applyTheme(message.theme);
      emit('theme', message.theme);
    } else if (message.type === 'response') {
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      if (message.error) entry.reject(Object.assign(new Error(message.error.message), { status: message.error.status }));
      else entry.resolve(message.result);
    }
  });

  // Hauteur du contenu : l'application ajuste l'iframe (pas de double barre de défilement)
  const reportHeight = () => post({ type: 'resize', height: document.documentElement.scrollHeight });
  if (window.ResizeObserver) {
    const observe = () => new ResizeObserver(reportHeight).observe(document.documentElement);
    if (document.readyState === 'loading') window.addEventListener('DOMContentLoaded', observe);
    else observe();
  }

  window.Almanach = {
    /** Contexte : { mod, page, universe, user: { id, displayName, role, canCreate, isAdmin }, theme }. */
    ready: () => readyPromise,
    get context() {
      return context;
    },
    on(event, callback) {
      if (!listeners.has(event)) listeners.set(event, []);
      listeners.get(event).push(callback);
    },

    entities: {
      /** type : 'characters', 'places', 'groups', 'species', 'creatures', 'stories', 'events' ou 'custom:<typeKey>' (types de ce mod). */
      list: (type) => call('entities.list', { type }),
      get: (type, id) => call('entities.get', { type, id }),
      /** Valeurs des champs ajoutés par ce mod aux fiches : { 'character:12': { champ: valeur } }. */
      metadata: () => call('entities.metadata', {}),
    },

    /** Données libres du mod dans l'univers courant, rangées par collection. */
    records: {
      list: (collection, options = {}) => call('records.list', { collection, summary: Boolean(options.summary) }),
      get: (id) => call('records.get', { id }),
      create: (collection, data) => call('records.create', { collection, data }),
      update: (id, data) => call('records.update', { id, data }),
      remove: (id) => call('records.remove', { id }),
    },

    /** Ouvre une page de l'univers, ex. Almanach.navigate(Almanach.pathOf('characters', 12)). */
    navigate: (path) => call('navigate', { path }),
    /** Chemin (relatif à l'univers) de la fiche d'une entité. */
    pathOf: (type, id) => call('pathOf', { type, id }),
    /** Message éphémère de l'application. kind : 'success' | 'error' | 'info'. */
    toast: (message, kind = 'info') => call('toast', { message: String(message), kind }),
    /** Remonte en haut de la page du mod (à appeler après un changement d'écran). */
    scrollToTop: () => call('scrollToTop', {}),
    /** Change l'adresse de la page (paramètres conservés au rechargement, ex. ?simulation=4). */
    setQuery: (params) => call('setQuery', { params }),
    /** URL affichable d'une image d'entité (/uploads/... ou URL externe). */
    imageUrl: (path) => {
      if (!path) return null;
      return /^https?:\/\//.test(path) ? path : `${context?.uploadsBase || ''}${path}`;
    },
  };

  post({ type: 'hello' });
})();
