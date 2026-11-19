import { useState } from 'react';
import { Link, useOutletContext } from 'react-router';
import { ArrowDown, ArrowUp, CircleAlert, Pencil, Plus, Trash2 } from '@/components/ui/icons';
import { useDeleteEntity, useEntityList, useReorderEntity } from '@/api/queries';
import { useCollectionLinks } from '@/api/collections';
import { useCollectionFilter } from '@/components/collections/collectionFilter';
import { REFERENCES, getModulesState, isModuleEnabled } from '@/config/modules';
import { REFERENCE_CONFIG } from '@/config/references';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Dialog } from '@/components/ui/Dialog';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { useToast } from '@/components/ui/Toast';
import { ReferenceDialog } from '@/components/references/ReferenceDialog';
import styles from '@/components/references/References.module.scss';
import { plainText, plural, universePath } from '@/utils/universe';
import page from '../Page.module.scss';
import { usePermissions } from '@/auth/auth';

/**
 * Page d'un référentiel (genres, statuts, types de lieux...) : liste ordonnable, utilisation
 * de chaque valeur, ajout / modification dans une fenêtre, suppression avec confirmation.
 */
export default function ReferencePage({ referenceKey }) {
  const { universe } = useOutletContext();
  const { isAdmin } = usePermissions();
  const reference = REFERENCES.find((r) => r.key === referenceKey);
  const config = REFERENCE_CONFIG[referenceKey];
  const modules = getModulesState(universe);
  // Collections : utilisées par des entités de tous types (liens), filtrées depuis la barre latérale
  const byLinks = Boolean(config.usage.collections);
  const usageEnabled = byLinks || config.usage.resource === 'characters' || isModuleEnabled(modules, config.usage.resource);

  const items = useEntityList(referenceKey, universe.id);
  const users = useEntityList(config.usage.resource, universe.id, { enabled: usageEnabled && !byLinks });
  const links = useCollectionLinks(universe.id, { enabled: byLinks });
  const collectionFilter = useCollectionFilter();
  const reorder = useReorderEntity(referenceKey, universe.id);
  const remove = useDeleteEntity(referenceKey);
  const toast = useToast();

  // Fenêtres : édition (`editing` : élément, ou 'new') et suppression
  const [editing, setEditing] = useState(null);
  const [deleting, setDeleting] = useState(null);

  const list = items.data || [];
  const usageCount = (id) =>
    byLinks
      ? (links.data || []).filter((l) => l.collectionId === id).length
      : (users.data || []).filter((u) => config.usage.values(u).includes(id)).length;
  const hasColor = config.fields.includes('color');

  const move = (index, delta) => {
    const ids = list.map((i) => i.id);
    const [moved] = ids.splice(index, 1);
    ids.splice(index + delta, 0, moved);
    reorder.mutate(ids, { onError: (err) => toast.error(err.message) });
  };

  const confirmDelete = () =>
    remove.mutate(deleting.id, {
      onSuccess: () => {
        toast.success(`« ${deleting.name} » a été supprimé.`);
        setDeleting(null);
      },
      onError: (err) => toast.error(err.message),
    });

  const addButton = isAdmin && (
    <Button variant="primary" icon={Plus} onClick={() => setEditing('new')}>
      Ajouter
    </Button>
  );
  const [nounOne, nounMany] = config.usage.noun;
  const deletingCount = deleting ? usageCount(deleting.id) : 0;

  return (
    <main className={`${page.main} ${page.mainSpaced} ${styles.page}`}>
      <header className={styles.header}>
        <span className={styles.icon}>
          <reference.icon aria-hidden />
        </span>
        <div className={styles.heading}>
          <h1 className={page.title}>{reference.label}</h1>
          <p className={styles.lead}>{config.description}</p>
        </div>
        {list.length > 0 && addButton}
      </header>

      {items.isPending ? (
        <Spinner label="Chargement…" />
      ) : items.error ? (
        <EmptyState icon={CircleAlert} title="Impossible de charger ce référentiel" action={<Button onClick={() => items.refetch()}>Réessayer</Button>}>
          {items.error.message}
        </EmptyState>
      ) : list.length === 0 ? (
        <EmptyState icon={reference.icon} title={config.emptyTitle || `Aucun ${config.singular} pour l’instant`} action={addButton}>
          {isAdmin ? `Ajoutez les valeurs proposées dans les fiches de « ${universe.name} ».` : 'Seuls les administrateurs peuvent ajouter des valeurs.'}
        </EmptyState>
      ) : (
        <>
          <p className={styles.count}>
            {plural(list.length, 'élément')}
          </p>
          <ol className={styles.list}>
            {list.map((item, index) => {
              const count = usageCount(item.id);
              return (
                <li key={item.id} className={styles.row} style={hasColor ? { '--item-color': item.color } : undefined}>
                  {isAdmin && <span className={styles.order}>
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon={ArrowUp}
                      aria-label={`Monter « ${item.name} »`}
                      disabled={index === 0 || reorder.isPending}
                      onClick={() => move(index, -1)}
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      iconOnly
                      icon={ArrowDown}
                      aria-label={`Descendre « ${item.name} »`}
                      disabled={index === list.length - 1 || reorder.isPending}
                      onClick={() => move(index, 1)}
                    />
                  </span>}
                  <span className={styles.body}>
                    {hasColor ? <Badge color={item.color}>{item.name}</Badge> : <span className={styles.name}>{item.name}</span>}
                    {plainText(item.description) && <span className={styles.description}>{plainText(item.description)}</span>}
                  </span>
                  {usageEnabled &&
                    (count > 0 && byLinks ? (
                      <button
                        type="button"
                        className={styles.usage}
                        title="Filtrer l’univers sur cette collection"
                        onClick={() => {
                          collectionFilter.setFilter(String(item.id));
                          toast.success(`Univers filtré sur « ${item.name} ».`);
                        }}
                      >
                        {plural(count, nounOne, nounMany)}
                      </button>
                    ) : count > 0 ? (
                      <Link to={`${universePath(universe, config.usage.path)}?${config.usage.filter}=${item.id}`} className={styles.usage}>
                        {plural(count, nounOne, nounMany)}
                      </Link>
                    ) : (
                      <span className={styles.unused}>Inutilisé</span>
                    ))}
                  {isAdmin && (
                    <span className={styles.actions}>
                      <Button variant="ghost" size="sm" iconOnly icon={Pencil} aria-label={`Modifier « ${item.name} »`} onClick={() => setEditing(item)} />
                      <Button variant="danger-ghost" size="sm" iconOnly icon={Trash2} aria-label={`Supprimer « ${item.name} »`} onClick={() => setDeleting(item)} />
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </>
      )}

      {editing && (
        <ReferenceDialog
          key={editing === 'new' ? 'new' : editing.id}
          open
          onClose={() => setEditing(null)}
          universe={universe}
          resource={referenceKey}
          config={config}
          item={editing === 'new' ? null : editing}
        />
      )}

      <Dialog
        open={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        dismissible={!remove.isPending}
        size="sm"
        title={deleting ? `Supprimer « ${deleting.name} » ?` : ''}
        description={
          deletingCount > 0
            ? byLinks
              ? `${plural(deletingCount, nounOne, nounMany)} ${deletingCount > 1 ? 'seront retirées' : 'sera retirée'} de cette collection (elles ne sont pas supprimées).`
              : `${plural(deletingCount, nounOne, nounMany)} ${deletingCount > 1 ? 'perdront' : 'perdra'} cette valeur (le champ redeviendra « Non renseigné »).`
            : 'Cette valeur n’est utilisée nulle part.'
        }
        footer={
          <>
            <Button variant="ghost" onClick={() => setDeleting(null)} disabled={remove.isPending}>Annuler</Button>
            <Button variant="danger" onClick={confirmDelete} loading={remove.isPending}>Supprimer</Button>
          </>
        }
      />
    </main>
  );
}
