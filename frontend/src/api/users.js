import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { request } from './client';

/** Comptes utilisateurs (admins), éditeurs liés aux entités, mot de passe. */
export const usersApi = {
  list: () => request('/users'),
  editors: () => request('/users/editors'),
  create: (data) => request('/users', { method: 'POST', body: data }),
  update: (id, data) => request(`/users/${id}`, { method: 'PUT', body: data }),
  remove: (id) => request(`/users/${id}`, { method: 'DELETE' }),
  entityEditors: (type, id) => request(`/editors/${type}/${id}`),
  editorsByType: (type) => request(`/editors/${type}`),
  setEntityEditors: (type, id, userIds) => request(`/editors/${type}/${id}`, { method: 'PUT', body: { userIds } }),
  changePassword: (currentPassword, newPassword) => request('/auth/password', { method: 'PUT', body: { currentPassword, newPassword } }),
};

const usersKey = ['users'];

export const useUsers = ({ enabled = true } = {}) => useQuery({ queryKey: [...usersKey, 'list'], queryFn: usersApi.list, enabled });

/** Comptes éditeurs (pour les lier à une entité). */
export const useEditorAccounts = () => useQuery({ queryKey: [...usersKey, 'editors'], queryFn: usersApi.editors });

/** Mutation de compte : rafraîchit la liste des comptes (et la session, si elle est concernée). */
const useUserMutation = (mutationFn) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: usersKey });
      queryClient.invalidateQueries({ queryKey: ['auth'] });
    },
  });
};
export const useCreateUser = () => useUserMutation(usersApi.create);
export const useUpdateUser = () => useUserMutation(({ id, data }) => usersApi.update(id, data));
export const useDeleteUser = () => useUserMutation(usersApi.remove);

export const useChangePassword = () => useMutation({ mutationFn: ({ currentPassword, newPassword }) => usersApi.changePassword(currentPassword, newPassword) });

/** Éditeurs de toutes les entités d'un type : { [entityId]: [{ id, displayName, username }] }. */
export const useEditorsByType = (type) =>
  useQuery({ queryKey: ['editors', type, 'all'], queryFn: () => usersApi.editorsByType(type) });

/** Éditeurs liés à une entité (type : character, place, group, specie, creature, story, event). */
export const useEntityEditors = (type, id) => {
  const queryClient = useQueryClient();
  const key = ['editors', type, Number(id)];
  const query = useQuery({ queryKey: key, queryFn: () => usersApi.entityEditors(type, id), enabled: Number(id) > 0 });
  const save = useMutation({
    mutationFn: (userIds) => usersApi.setEntityEditors(type, id, userIds),
    onSuccess: (editors) => {
      queryClient.setQueryData(key, editors);
      queryClient.invalidateQueries({ queryKey: ['editors', type, 'all'] }); // colonne « Éditeurs » des tableaux
      queryClient.invalidateQueries({ queryKey: ['auth'] }); // l'éditeur a pu se retirer lui-même
    },
  });
  return { query, save };
};
