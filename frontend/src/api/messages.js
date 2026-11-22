import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from './client';

/*
 * Messages : système commun du roleplay (fils, scènes : api/roleplay.js) et des récits d'épisodes
 * (voir backend/services/messages.js). Un message : { id, content, characterIds, author, roll, effect, imagePath,
 * soundPath, isHrp, placeId, sceneId, episodeId, travels, createdAt, updatedAt }.
 */

/** Envoi de plusieurs messages d'un coup : { parts: [{ content, characterIds, command? }], image?, sound? }. */
export const postMessages = (path, { parts, image, sound }) => {
  if (!image && !sound) return request(path, { method: 'POST', body: { parts } });
  const form = new FormData();
  form.append('parts', JSON.stringify(parts));
  if (image) form.append('image', image);
  if (sound) form.append('sound', sound);
  return request(path, { method: 'POST', body: form });
};

export const messagesApi = {
  /** Modifie un message : { content?, characterIds? }. */
  update: (id, data) => request(`/messages/${id}`, { method: 'PUT', body: data }),
  remove: (id) => request(`/messages/${id}`, { method: 'DELETE' }),
  /** Récit d'un épisode : { messages, effectsBefore }. */
  episode: (episodeId) => request(`/episodes/${episodeId}/messages`),
  createEpisodeMessages: (episodeId, data) => postMessages(`/episodes/${episodeId}/messages`, data),
};

export const messageKeys = {
  episode: (episodeId) => ['messages', 'episode', Number(episodeId)],
};

/** Récit d'un épisode, en messages : { messages, effectsBefore }. */
export const useEpisodeMessages = (episodeId, { enabled = true } = {}) =>
  useQuery({ queryKey: messageKeys.episode(episodeId), queryFn: () => messagesApi.episode(episodeId), enabled: enabled && Number(episodeId) > 0 });

/** Écriture, modification et suppression des messages du récit d'un épisode. */
export const useEpisodeMessageMutations = (episodeId) => {
  const queryClient = useQueryClient();
  const key = messageKeys.episode(episodeId);
  const setMessages = (fn) => queryClient.setQueryData(key, (data) => data && { ...data, messages: fn(data.messages) });
  return {
    createMany: useMutation({
      mutationFn: (data) => messagesApi.createEpisodeMessages(episodeId, data),
      onSuccess: (created) => setMessages((list) => [...list, ...created.filter((m) => !list.some((x) => x.id === m.id))]),
    }),
    update: useMutation({
      mutationFn: ({ id, data }) => messagesApi.update(id, data),
      onSuccess: (message) => setMessages((list) => list.map((m) => (m.id === message.id ? message : m))),
    }),
    remove: useMutation({
      mutationFn: (id) => messagesApi.remove(id),
      onSuccess: (_data, id) => setMessages((list) => list.filter((m) => m.id !== id)),
    }),
  };
};
