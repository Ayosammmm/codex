import { collectionsApi } from '@/api/collections';
import { Badge } from '@/components/ui/Badge';
import { dash } from '@/components/entity/EntityTable';
import form from '@/components/entity/EntityForm.module.scss';
import { plainText } from '@/utils/universe';
import { useCollectionFilter } from './collectionFilter';

/**
 * Colonne « Collections » d'un tableau d'entités (masquée par défaut), modifiable en masse (ajout, retrait, remplacement :
 * voir TableControls). Absente si le module Collections est désactivé.
 * `entityType` : character, place, group, specie, creature, story, event.
 */
export function useCollectionsColumn(entityType) {
  const { enabled, collections, collectionIdsOf } = useCollectionFilter();
  if (!enabled) return null;

  const byId = new Map(collections.map((c) => [c.id, c]));
  // Dans l'ordre du référentiel
  const collectionsOf = (item) => {
    const ids = collectionIdsOf(entityType, item.id);
    return collections.filter((c) => ids.includes(c.id));
  };

  return {
    key: 'collections',
    label: 'Collections',
    defaultHidden: true,
    render: (item) => {
      const list = collectionsOf(item);
      return list.length ? (
        <span className={form.badges}>
          {list.map((c) => <Badge key={c.id} color={c.color}>{c.name}</Badge>)}
        </span>
      ) : dash;
    },
    edit: {
      type: 'multi',
      options: collections.map((c) => ({ value: c.id, label: c.name, color: c.color, description: plainText(c.description) || undefined })),
      emptyText: 'Aucune collection',
      current: (item) => collectionIdsOf(entityType, item.id).filter((id) => byId.has(id)),
      save: (item, collectionIds) => collectionsApi.setLinks(entityType, item.id, collectionIds),
    },
  };
}
