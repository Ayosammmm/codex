import { Link, useOutletContext, useParams } from 'react-router';
import { CircleAlert } from '@/components/ui/icons';
import { useEntity } from '@/api/queries';
import { Button } from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { universePath } from '@/utils/universe';
import page from './Page.module.scss';

/**
 * Charge l'entité de l'URL et gère attente / erreur ; `children(entity, universe)` une fois disponible.
 * - `resource` : clé de RESOURCES (characters, groups...) ; `param` : paramètre d'URL de l'id
 * - `labels`   : { loading, notFound, notFoundText, error, back, listPath }
 */
export function EntityLoader({ resource, param, labels, children }) {
  const { universe } = useOutletContext();
  const id = useParams()[param];
  const { data: entity, isPending, error } = useEntity(resource, id, { universeId: universe.id });

  if (isPending) return <Spinner label={labels.loading} />;
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
