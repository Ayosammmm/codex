import { Link, Navigate, Outlet, useLocation } from 'react-router';
import { CircleAlert, ShieldX } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import page from '@/pages/Page.module.scss';
import { useAuth, usePermissions } from './auth';

/** Route parente : toutes les pages de l'application demandent une connexion. */
export function RequireAuth() {
  const { status, error, logout } = useAuth();
  const location = useLocation();

  if (status === 'anonymous') {
    const back = location.pathname + location.search;
    return <Navigate to={back === '/' ? '/connexion' : `/connexion?retour=${encodeURIComponent(back)}`} replace />;
  }
  if (status === 'loading') return <Spinner className={page.fullHeight} label="Connexion…" />;
  if (status === 'error') {
    return (
      <div className={page.centered}>
        <EmptyState icon={CircleAlert} title="Impossible de vérifier votre session" action={<Button onClick={logout}>Se reconnecter</Button>}>
          {error?.message} Vérifiez que le backend est démarré.
        </EmptyState>
      </div>
    );
  }
  return <Outlet />;
}

/** Page réservée (ex. édition sans droits) : message à la place du contenu. */
export function Forbidden({ backTo = '/', children = 'Vous n’avez pas les droits pour modifier cet élément.' }) {
  return (
    <main className={page.narrow}>
      <EmptyState icon={ShieldX} title="Accès réservé" action={<Button as={Link} to={backTo} variant="primary">Retour</Button>}>
        {children}
      </EmptyState>
    </main>
  );
}

/** Page réservée aux admins (paramètres d'univers, création d'univers, comptes). */
export function AdminOnly({ children }) {
  const { isAdmin } = usePermissions();
  return isAdmin ? children : <Forbidden>Cette page est réservée aux administrateurs.</Forbidden>;
}
