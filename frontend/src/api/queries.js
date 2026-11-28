import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { universesApi, UNIVERSE_IMAGE_FIELDS } from './universes';
import { RESOURCES, characterFormsApi, photosApi } from './resources';
import { autoLinkValues } from '@/utils/autoLink';

export const universeKeys = {
  all: ['universes'],
  list: () => ['universes', 'list'],
  detail: (id) => ['universes', 'detail', Number(id)],
};

export const useUniverses = () =>
  useQuery({ queryKey: universeKeys.list(), queryFn: () => universesApi.list({ stats: true }) });

export const useUniverse = (id) =>
  useQuery({
    queryKey: universeKeys.detail(id),
    queryFn: () => universesApi.get(id),
    enabled: Number.isInteger(Number(id)) && Number(id) > 0,
    retry: (count, error) => error.status !== 404 && count < 2,
  });

/**
 * Enregistre un univers (création ou mise à jour) puis applique les changements d'images.
 * `images` : { logo|banner|background: File (nouvelle image) | null (à retirer) } ; clé absente = inchangée.
 */
export const useSaveUniverse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values, images = {} }) => {
      let universe = id ? await universesApi.update(id, values) : await universesApi.create(values);
      for (const field of UNIVERSE_IMAGE_FIELDS) {
        if (!(field in images)) continue;
        if (images[field]) universe = await universesApi.uploadImage(universe.id, field, images[field]);
        else if (id) universe = await universesApi.deleteImage(universe.id, field);
      }
      return universe;
    },
    onSuccess: (universe) => {
      queryClient.setQueryData(universeKeys.detail(universe.id), universe);
      queryClient.invalidateQueries({ queryKey: universeKeys.list() });
    },
    // Une création peut avoir réussi même si l'envoi d'une image a échoué
    onError: () => queryClient.invalidateQueries({ queryKey: universeKeys.all }),
  });
};

export const useDeleteUniverse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => universesApi.remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: universeKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: universeKeys.list() });
    },
  });
};

export const useDuplicateUniverse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }) => universesApi.duplicate(id, name),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: universeKeys.list() }),
  });
};

export const useImportUniverse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file) => universesApi.importFile(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: universeKeys.list() }),
  });
};

// ---------------------------------------------------------------------------
// Entités d'un univers
// ---------------------------------------------------------------------------

/**
 * Les entités sont liées entre elles (membres d'un groupe, groupes d'un personnage...) :
 * après une modification, toutes les données d'entités sont rafraîchies, sauf `except`.
 */
const invalidateEntities = (queryClient, except) =>
  queryClient.invalidateQueries({
    queryKey: ['entities'],
    predicate: (q) => !except || q.queryKey.join('/') !== except.join('/'),
  });

export const entityKeys = {
  list: (resource, universeId) => ['entities', resource, 'list', Number(universeId)],
  detail: (resource, id) => ['entities', resource, 'detail', Number(id)],
  photos: (entityType, id) => ['photos', entityType, Number(id)],
};

/** Liste d'une ressource de l'univers (voir RESOURCES dans api/resources.js). */
export const useEntityList = (resource, universeId, { enabled = true } = {}) =>
  useQuery({
    queryKey: entityKeys.list(resource, universeId),
    queryFn: () => RESOURCES[resource].list(universeId),
    enabled: enabled && Boolean(universeId),
  });

export const useEntity = (resource, id, { universeId } = {}) => {
  const queryClient = useQueryClient();
  return useQuery({
    queryKey: entityKeys.detail(resource, id),
    queryFn: () => RESOURCES[resource].get(id),
    enabled: Number(id) > 0,
    retry: (count, error) => error.status !== 404 && count < 2,
    // Affichage immédiat depuis la liste si elle est déjà chargée, en attendant la fiche complète.
    // Pas initialData : la version de liste est allégée (ex. formes d'un personnage sans fond, textes ni
    // références), elle serait gardée comme fiche complète tant qu'elle reste « fraîche ».
    placeholderData: () =>
      universeId ? queryClient.getQueryData(entityKeys.list(resource, universeId))?.find((e) => e.id === Number(id)) : undefined,
  });
};

/**
 * Enregistre une entité (création ou mise à jour) puis ses images.
 * `images` : { champ: File | null } — clé absente = inchangée.
 */
export const useSaveEntity = (resource) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, values: raw, images = {} }) => {
      const api = RESOURCES[resource];
      // Noms d'entités cités dans les champs riches : transformés en liens (voir utils/autoLink.js)
      const values = await autoLinkValues(queryClient, resource, raw, { id });
      let entity = id ? await api.update(id, values) : await api.create(values);
      for (const [field, value] of Object.entries(images)) {
        if (value) await api.uploadImage(entity.id, field, value);
        else if (id) await api.deleteImage(entity.id, field);
      }
      if (Object.keys(images).length) entity = await api.get(entity.id);
      return entity;
    },
    onSuccess: (entity) => {
      queryClient.setQueryData(entityKeys.detail(resource, entity.id), entity);
      invalidateEntities(queryClient, entityKeys.detail(resource, entity.id));
      queryClient.invalidateQueries({ queryKey: universeKeys.list() }); // compteurs
      queryClient.invalidateQueries({ queryKey: ['auth'] }); // une entité créée par un éditeur lui est liée
    },
    onError: () => queryClient.invalidateQueries({ queryKey: ['entities', resource] }),
  });
};

export const useDeleteEntity = (resource) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => RESOURCES[resource].remove(id),
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: entityKeys.detail(resource, id) });
      invalidateEntities(queryClient);
      queryClient.invalidateQueries({ queryKey: universeKeys.list() });
    },
  });
};

/** Réordonne un référentiel (affichage immédiat, puis données serveur). `ids` : nouvel ordre complet. */
export const useReorderEntity = (resource, universeId) => {
  const queryClient = useQueryClient();
  const key = entityKeys.list(resource, universeId);
  return useMutation({
    mutationFn: (ids) => RESOURCES[resource].reorder(ids),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData(key);
      if (previous) {
        const byId = new Map(previous.map((item) => [item.id, item]));
        queryClient.setQueryData(key, ids.map((id, i) => ({ ...byId.get(id), position: i + 1 })).filter((item) => item.id));
      }
      return { previous };
    },
    onError: (_err, _ids, context) => context?.previous && queryClient.setQueryData(key, context.previous),
    // Les entités qui affichent ce référentiel (tri, regroupements) se mettent à jour
    onSettled: () => invalidateEntities(queryClient),
  });
};

// --- Formes d'un personnage ---

/**
 * Mutations des autres formes d'un personnage. Chacune renvoie la fiche complète, mise en cache.
 * - add.mutate({ formName?, formType? })      : nouvelle forme, copie de la forme par défaut (sans les images) ;
 *                                               `formType` : 'transformation' (défaut) ou 'temporal' (époque, la plus ancienne)
 * - evolve.mutate({ formName? })              : faire évoluer (la forme par défaut devient l’époque la plus récente)
 * - reorder.mutate(ids)                       : nouvel ordre des formes d'un type
 * - save.mutate({ formId, values, images })   : `images` comme useSaveEntity ({ champ: File | null })
 * - remove.mutate(formId)
 */
export const useCharacterFormMutations = (characterId) => {
  const queryClient = useQueryClient();
  const onSuccess = (character) => {
    queryClient.setQueryData(entityKeys.detail('characters', character.id), character);
    invalidateEntities(queryClient, entityKeys.detail('characters', character.id));
  };
  const onError = () => queryClient.invalidateQueries({ queryKey: entityKeys.detail('characters', characterId) });
  const add = useMutation({ mutationFn: (data) => characterFormsApi.create(characterId, data), onSuccess, onError });
  const save = useMutation({
    mutationFn: async ({ formId, values: raw, images = {} }) => {
      // Liens automatiques (voir utils/autoLink.js) : la forme n'est jamais liée à son propre personnage
      const universeId = queryClient.getQueryData(entityKeys.detail('characters', characterId))?.universe_id;
      const values = await autoLinkValues(queryClient, 'characters', raw, { id: characterId, universeId });
      let character = await characterFormsApi.update(characterId, formId, values);
      for (const [field, value] of Object.entries(images)) {
        character = value
          ? await characterFormsApi.uploadFile(characterId, formId, field, value)
          : await characterFormsApi.deleteFile(characterId, formId, field);
      }
      return character;
    },
    onSuccess,
    onError,
  });
  const remove = useMutation({ mutationFn: (formId) => characterFormsApi.remove(characterId, formId), onSuccess, onError });
  const evolve = useMutation({ mutationFn: (data) => characterFormsApi.evolve(characterId, data), onSuccess, onError });
  const reorder = useMutation({ mutationFn: (ids) => characterFormsApi.reorder(characterId, ids), onSuccess, onError });
  return { add, save, remove, evolve, reorder };
};

// --- Albums photo ---

export const usePhotos = (entityType, id) =>
  useQuery({ queryKey: entityKeys.photos(entityType, id), queryFn: () => photosApi.list(entityType, id), enabled: Number(id) > 0 });

export const usePhotoMutations = (entityType, id) => {
  const queryClient = useQueryClient();
  const refresh = () => queryClient.invalidateQueries({ queryKey: entityKeys.photos(entityType, id) });
  return {
    upload: useMutation({ mutationFn: (file) => photosApi.upload(entityType, id, file), onSettled: refresh }),
    update: useMutation({ mutationFn: ({ photoId, data }) => photosApi.update(photoId, data), onSettled: refresh }),
    remove: useMutation({ mutationFn: (photoId) => photosApi.remove(photoId), onSettled: refresh }),
  };
};
