import { useEffect, useRef } from 'react';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { API_BASE, getToken, request } from './client';
import { messagesApi, postMessages } from './messages';

/**
 * Roleplay écrit : fil de messages par lieu, scènes (voir backend/controllers/roleplayController.js).
 * Les messages eux-mêmes sont un système commun (api/messages.js) : modification et suppression passent par lui.
 */
export const roleplayApi = {
  overview: (universeId) => request(`/roleplay/overview?universe_id=${universeId}`),
  /** Sons joués dans les scènes de l'univers : [{ id, sceneId, soundPath, kind: 'ambience' | 'sound', createdAt }]. */
  sceneSounds: (universeId) => request(`/roleplay/sounds?universe_id=${universeId}`),
  messages: (placeId, { before } = {}) => request(`/roleplay/places/${placeId}/messages${before ? `?before=${before}` : ''}`),
  /** Plusieurs messages d'un coup : { parts: [{ content, characterIds }], image? } (image jointe au dernier). */
  createMessages: (placeId, data) => postMessages(`/roleplay/places/${placeId}/messages`, data),
  /** Messages écrits directement dans une scène hors roleplay (même format). */
  createSceneMessages: (sceneId, data) => postMessages(`/roleplay/scenes/${sceneId}/messages`, data),
  updateMessage: messagesApi.update,
  deleteMessage: messagesApi.remove,
  markRead: (placeId, messageId) => request(`/roleplay/places/${placeId}/read`, { method: 'PUT', body: { messageId } }),
  character: (characterId) => request(`/roleplay/characters/${characterId}`),
  episodeScenes: (episodeId) => request(`/roleplay/episodes/${episodeId}/scenes`),
  setEpisodeScenes: (episodeId, sceneIds) => request(`/roleplay/episodes/${episodeId}/scenes`, { method: 'PUT', body: { sceneIds } }),
  scene: (id) => request(`/roleplay/scenes/${id}`),
  /** Scènes précédente et suivante (dans l'ordre de l'histoire `storyId` si la scène en fait partie, sinon chronologique). */
  sceneNeighbours: (id, storyId) => request(`/roleplay/scenes/${id}/neighbours${storyId ? `?story=${storyId}` : ''}`),
  createScene: (data) => request('/roleplay/scenes', { method: 'POST', body: data }),
  updateScene: (id, data) => request(`/roleplay/scenes/${id}`, { method: 'PUT', body: data }),
  deleteScene: (id) => request(`/roleplay/scenes/${id}`, { method: 'DELETE' }),
};

export const roleplayKeys = {
  all: ['roleplay'],
  overview: (universeId) => ['roleplay', 'overview', Number(universeId)],
  sounds: (universeId) => ['roleplay', 'sounds', Number(universeId)],
  place: (placeId) => ['roleplay', 'messages', Number(placeId)],
  character: (characterId) => ['roleplay', 'character', Number(characterId)],
  episode: (episodeId) => ['roleplay', 'episode', Number(episodeId)],
  scene: (id) => ['roleplay', 'scene', Number(id)],
};

export const useRoleplayOverview = (universeId, { enabled = true } = {}) =>
  useQuery({ queryKey: roleplayKeys.overview(universeId), queryFn: () => roleplayApi.overview(universeId), enabled: enabled && Boolean(universeId) });

export const useSceneSounds = (universeId, { enabled = true } = {}) =>
  useQuery({ queryKey: roleplayKeys.sounds(universeId), queryFn: () => roleplayApi.sceneSounds(universeId), enabled: enabled && Boolean(universeId) });

export const useCharacterRoleplay = (characterId, { enabled = true } = {}) =>
  useQuery({ queryKey: roleplayKeys.character(characterId), queryFn: () => roleplayApi.character(characterId), enabled: enabled && Number(characterId) > 0 });

export const useEpisodeScenes = (episodeId, { enabled = true } = {}) =>
  useQuery({ queryKey: roleplayKeys.episode(episodeId), queryFn: () => roleplayApi.episodeScenes(episodeId), enabled: enabled && Number(episodeId) > 0 });

/** Remplace les scènes d'un épisode : mutate({ episodeId, sceneIds }). */
export const useSetEpisodeScenes = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ episodeId, sceneIds }) => roleplayApi.setEpisodeScenes(episodeId, sceneIds),
    onSuccess: (scenes, { episodeId }) => {
      queryClient.setQueryData(roleplayKeys.episode(episodeId), scenes);
      // Vue d'ensemble, pages des scènes, fiches personnages
      queryClient.invalidateQueries({ queryKey: roleplayKeys.all, predicate: (q) => q.queryKey[1] !== 'episode' });
    },
  });
};

export const useSceneNeighbours = (id, storyId) =>
  useQuery({
    queryKey: [...roleplayKeys.scene(id), 'neighbours', Number(storyId) || 0],
    queryFn: () => roleplayApi.sceneNeighbours(id, storyId),
    enabled: Number(id) > 0,
  });

export const useScene = (id) =>
  useQuery({ queryKey: roleplayKeys.scene(id), queryFn: () => roleplayApi.scene(id), enabled: Number(id) > 0, retry: (n, e) => e.status !== 404 && n < 2 });

/**
 * Fil d'un lieu, par pages de 50 en remontant le temps. `pages` : de la plus récente à la plus ancienne ;
 * `messages` : tous les messages chargés, du plus ancien au plus récent.
 */
export function usePlaceMessages(placeId) {
  const query = useInfiniteQuery({
    queryKey: roleplayKeys.place(placeId),
    queryFn: ({ pageParam }) => roleplayApi.messages(placeId, { before: pageParam }),
    initialPageParam: undefined,
    getNextPageParam: (last) => (last.hasMore && last.messages.length ? last.messages[0].id : undefined),
    enabled: Number(placeId) > 0,
  });
  const messages = query.data ? [...query.data.pages].reverse().flatMap((p) => p.messages) : [];
  return { ...query, messages };
}

// ---------------------------------------------------------------------------
// Mise à jour du cache (réponses de l'API et événements temps réel)
// ---------------------------------------------------------------------------

const updatePages = (data, fn) => (data ? { ...data, pages: data.pages.map((page, i) => ({ ...page, messages: fn(page.messages, i) })) } : data);

/** Applique un événement { type, placeId, message | messageId } au fil chargé de ce lieu. */
export function applyRoleplayEvent(queryClient, event) {
  const { type, placeId } = event;
  const key = roleplayKeys.place(placeId);
  const data = queryClient.getQueryData(key);
  if (data) {
    if (type === 'message:created') {
      // Page 0 = la plus récente ; pas de doublon si la réponse de l'API est déjà arrivée
      queryClient.setQueryData(key, updatePages(data, (msgs, i) =>
        i === 0 && !data.pages.some((p) => p.messages.some((m) => m.id === event.message.id)) ? [...msgs, event.message] : msgs));
    } else if (type === 'message:updated') {
      queryClient.setQueryData(key, updatePages(data, (msgs) => msgs.map((m) => (m.id === event.message.id ? event.message : m))));
    } else if (type === 'message:deleted') {
      queryClient.setQueryData(key, updatePages(data, (msgs) => msgs.filter((m) => m.id !== event.messageId)));
    }
  }
  if (type === 'scenes:changed') queryClient.invalidateQueries({ queryKey: roleplayKeys.place(placeId) });
  // Vues d'ensemble, scènes et fiches : rechargées à la prochaine consultation
  queryClient.invalidateQueries({ queryKey: ['roleplay'], predicate: (q) => q.queryKey[1] !== 'messages' });
}

export const useRoleplayMutations = (placeId) => {
  const queryClient = useQueryClient();
  const apply = (event) => applyRoleplayEvent(queryClient, { placeId, ...event });
  return {
    createMany: useMutation({
      mutationFn: (data) => roleplayApi.createMessages(placeId, data),
      onSuccess: (messages) => messages.forEach((message) => apply({ type: 'message:created', message })),
    }),
    update: useMutation({
      mutationFn: ({ id, data }) => roleplayApi.updateMessage(id, data),
      onSuccess: (message) => apply({ type: 'message:updated', message }),
    }),
    remove: useMutation({
      mutationFn: (id) => roleplayApi.deleteMessage(id),
      onSuccess: (_data, id) => apply({ type: 'message:deleted', messageId: id }),
    }),
  };
};

/**
 * Marque le fil comme lu jusqu'au dernier message affiché, quand l'onglet est visible
 * (à l'ouverture, à chaque nouveau message, et au retour sur l'onglet). Efface la bulle « non lu ».
 */
export function useMarkPlaceRead(universeId, placeId, lastMessageId, { enabled = true } = {}) {
  const queryClient = useQueryClient();
  const marked = useRef(0);
  useEffect(() => {
    if (!enabled || !lastMessageId) return undefined;
    const mark = () => {
      if (document.hidden || lastMessageId <= marked.current) return;
      marked.current = lastMessageId;
      roleplayApi.markRead(placeId, lastMessageId).then(
        () =>
          queryClient.setQueryData(roleplayKeys.overview(universeId), (data) =>
            data && { ...data, places: data.places.map((p) => (p.placeId === Number(placeId) ? { ...p, unread: 0 } : p)) }),
        () => {
          marked.current = 0; // réessai au prochain message
        },
      );
    };
    mark();
    document.addEventListener('visibilitychange', mark);
    return () => document.removeEventListener('visibilitychange', mark);
  }, [enabled, lastMessageId, placeId, universeId, queryClient]);
}

/**
 * Messages d'une scène, depuis son édition : écriture (scène hors roleplay seulement), modification, suppression.
 * La scène, les vues d'ensemble et les fils chargés (messages d'une scène du roleplay) sont rechargés ensuite.
 */
export const useSceneMessageMutations = (sceneId) => {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: roleplayKeys.all });
  return {
    createMany: useMutation({ mutationFn: (data) => roleplayApi.createSceneMessages(sceneId, data), onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, data }) => roleplayApi.updateMessage(id, data), onSuccess: refresh }),
    remove: useMutation({ mutationFn: (id) => roleplayApi.deleteMessage(id), onSuccess: refresh }),
  };
};

export const useSceneMutations = () => {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: roleplayKeys.all });
  return {
    create: useMutation({ mutationFn: roleplayApi.createScene, onSuccess: refresh }),
    update: useMutation({ mutationFn: ({ id, data }) => roleplayApi.updateScene(id, data), onSuccess: refresh }),
    remove: useMutation({ mutationFn: roleplayApi.deleteScene, onSuccess: refresh }),
  };
};

// ---------------------------------------------------------------------------
// Temps réel : une connexion WebSocket partagée, abonnée aux fils affichés
// ---------------------------------------------------------------------------

const socketUrl = () => {
  const base = new URL(API_BASE, window.location.href);
  base.protocol = base.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${base.href.replace(/\/$/, '')}/ws`;
};

const socket = {
  ws: null,
  ready: false,
  subscriptions: new Map(), // placeId -> nombre d'abonnés
  listeners: new Set(),
  retry: 0,
  timer: null,

  send(data) {
    if (this.ws && this.ready) this.ws.send(JSON.stringify(data));
  },

  connect() {
    if (this.ws || !getToken()) return;
    const ws = new WebSocket(socketUrl());
    this.ws = ws;
    ws.onopen = () => ws.send(JSON.stringify({ type: 'auth', token: getToken() }));
    ws.onmessage = (e) => {
      let event;
      try {
        event = JSON.parse(e.data);
      } catch {
        return;
      }
      if (event.type === 'ready') {
        const reconnected = this.retry > 0;
        this.ready = true;
        this.retry = 0;
        for (const placeId of this.subscriptions.keys()) this.send({ type: 'subscribe', placeId });
        // Messages manqués pendant la coupure
        if (reconnected) for (const fn of this.listeners) fn({ type: 'reconnected' });
        return;
      }
      for (const fn of this.listeners) fn(event);
    };
    ws.onclose = (e) => {
      this.ws = null;
      this.ready = false;
      // Session refusée : pas de nouvelle tentative ; sinon reconnexion progressive tant que des fils sont ouverts
      if (e.code === 4401 || !this.subscriptions.size) return;
      this.retry += 1;
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.connect(), Math.min(30000, 1000 * 2 ** Math.min(this.retry, 5)));
    };
  },

  subscribe(placeId) {
    const n = this.subscriptions.get(placeId) || 0;
    this.subscriptions.set(placeId, n + 1);
    if (!n) this.send({ type: 'subscribe', placeId });
    this.connect();
  },

  unsubscribe(placeId) {
    const n = (this.subscriptions.get(placeId) || 1) - 1;
    if (n > 0) return this.subscriptions.set(placeId, n);
    this.subscriptions.delete(placeId);
    this.send({ type: 'unsubscribe', placeId });
    if (!this.subscriptions.size) {
      clearTimeout(this.timer);
      this.ws?.close();
    }
  },
};

/** Abonne la page au fil d'un lieu : les messages des autres arrivent en direct. */
export function useRoleplaySocket(placeId) {
  const queryClient = useQueryClient();
  useEffect(() => {
    const id = Number(placeId);
    if (!id) return undefined;
    const listener = (event) => {
      if (event.type === 'reconnected') queryClient.invalidateQueries({ queryKey: roleplayKeys.place(id) });
      else if (event.placeId === id) applyRoleplayEvent(queryClient, event);
    };
    socket.listeners.add(listener);
    socket.subscribe(id);
    return () => {
      socket.listeners.delete(listener);
      socket.unsubscribe(id);
    };
  }, [placeId, queryClient]);
}
