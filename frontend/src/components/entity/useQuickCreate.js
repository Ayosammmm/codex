import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { RESOURCES } from '@/api/resources';
import { entityKeys, universeKeys } from '@/api/queries';
import { useToast } from '@/components/ui/Toast';

const NOUNS = {
  groups: 'Groupe',
  species: 'Espèce',
  places: 'Lieu',
};

/**
 * Création express d'une entité à partir de son seul nom (groupe, espèce, lieu…),
 * depuis un champ d'appartenance. L'entité est enregistrée tout de suite et ajoutée
 * à la liste en cache, pour être aussitôt proposée et choisie dans le formulaire.
 * Renvoie `async (nom) => entité | null` (null en cas d'erreur, signalée par une notification).
 */
export function useQuickCreate(resource, universeId) {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useCallback(
    async (name) => {
      try {
        const entity = await RESOURCES[resource].create({ name, universe_id: universeId });
        queryClient.setQueryData(entityKeys.list(resource, universeId), (list) => (list ? [...list, entity] : [entity]));
        queryClient.setQueryData(entityKeys.detail(resource, entity.id), entity);
        queryClient.invalidateQueries({ queryKey: universeKeys.list() }); // compteurs
        queryClient.invalidateQueries({ queryKey: ['auth'] }); // une entité créée par un éditeur lui est liée
        const noun = NOUNS[resource] || 'Fiche';
        toast.success(`${noun} « ${entity.name} » ${resource === 'species' ? 'créée' : 'créé'}.`);
        return entity;
      } catch (error) {
        toast.error(error.message || 'La création a échoué.');
        return null;
      }
    },
    [resource, universeId, queryClient, toast],
  );
}

/** Variante pour un Combobox : `onCreate` qui renvoie l'id de l'entité créée. */
export function useQuickCreateId(resource, universeId) {
  const create = useQuickCreate(resource, universeId);
  return useCallback(async (name) => (await create(name))?.id ?? null, [create]);
}
