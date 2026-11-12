import { useEditorAccounts, useEditorsByType, usersApi } from '@/api/users';
import { dash } from './EntityTable';

/**
 * Colonne « Éditeurs » d'un tableau d'entités (masquée par défaut), modifiable en masse.
 * Les éditeurs liés à une entité peuvent la modifier (voir EditorsSection).
 * `entityType` : character, place, group, specie, creature, story, event.
 */
export function useEditorsColumn(entityType) {
  const byEntity = useEditorsByType(entityType).data || {};
  const accounts = useEditorAccounts().data || [];
  const editorsOf = (item) => byEntity[item.id] || [];

  return {
    key: 'editors',
    label: 'Éditeurs',
    defaultHidden: true,
    render: (item) => editorsOf(item).map((u) => u.displayName).join(', ') || dash,
    edit: {
      // Liste de comptes : ajout, retrait ou remplacement (voir TableControls)
      type: 'multi',
      options: accounts.map((u) => ({ value: u.id, label: u.displayName, description: `@${u.username}` })),
      emptyText: 'Aucun compte éditeur',
      current: (item) => editorsOf(item).map((u) => u.id),
      save: (item, userIds) => usersApi.setEntityEditors(entityType, item.id, userIds),
    },
  };
}
