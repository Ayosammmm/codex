import { Link, useLocation, useOutletContext, useParams } from 'react-router';
import { CircleAlert } from '@/components/ui/icons';
import { useEntity } from '@/api/queries';
import { Button } from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { universePath } from '@/utils/universe';
import { usePageTitle } from '@/utils/usePageTitle';
import { characterName } from '@/config/characters';
import page from './Page.module.scss';

/**
 * Charge l'entité de l'URL et gère attente / erreur ; `children(entity, universe)` une fois disponible.
 * - `resource` : clé de RESOURCES (characters, groups...) ; `param` : paramètre d'URL de l'id
 * - `labels`   : { loading, notFound, notFoundText, error, back, listPath }
 */
export function EntityLoader({ resource, param, labels, children }) {
  const { universe } = useOutletContext();
  const id = useParams()[param];
  const { data: entity, isPending, isPlaceholderData, error } = useEntity(resource, id, { universeId: universe.id });
  // Édition : le formulaire s'initialise une seule fois, il attend la fiche complète (pas la version de liste)
  const editing = useLocation().pathname.endsWith('/modifier');
  // Nom de la fiche dans le titre de l'onglet (personnages : prénom + nom ; épisodes : titre)
  usePageTitle(entity && (resource === 'characters' ? characterName(entity) : entity.name || entity.title));

  if (isPending || (editing && isPlaceholderData)) return <Spinner label={labels.loading} />;
  if (error || !entity) {
    const notFound = error?.status === 404;
    return (
      <main className={page.narrow}>
        <EmptyState
          icon={CircleAlert}
          title={notFound ? labels.notFound : labels.error}
          action={<Button as={Link} to={universePath(universe, labels.listPath)} variant="primary">{labels.back}</Button>}
        >
          {notFound ? labels.notFoundText : error?.message}
        </EmptyState>
      </main>
    );
  }
  return children(entity, universe);
}
