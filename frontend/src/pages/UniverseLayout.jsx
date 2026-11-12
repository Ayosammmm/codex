import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate, useParams, useLocation } from 'react-router';
import { CircleAlert, Menu } from 'lucide-react';
import { useUniverse } from '@/api/queries';
import { UniverseSidebar } from '@/components/layout/UniverseSidebar';
import { Button } from '@/components/ui/Button';
import { EmptyState, Spinner } from '@/components/ui/Feedback';
import { cx } from '@/components/ui/cx';
import { UniverseAvatar } from '@/components/universe/UniverseAvatar';
import { ThemeKeyContext } from '@/theme/themeKey';
import { universeBackdropStyle, universeThemeProps } from '@/theme/universeTheme';
import { parseUniverseRef, universeRef } from '@/utils/universe';
import page from './Page.module.scss';
import styles from './UniverseLayout.module.scss';

/**
 * Cadre commun à toutes les pages d'un univers : applique son thème, ses couleurs
 * et son fond, affiche la navigation, et fournit l'univers aux pages enfants via useOutletContext().
 */
export default function UniverseLayout() {
  const { universeRef: ref } = useParams();
  const id = parseUniverseRef(ref);
  const { data: universe, isPending, error } = useUniverse(id);
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  // URL canonique : /univers/<id>-<nom actuel>
  useEffect(() => {
    if (!universe) return;
    const canonical = universeRef(universe);
    if (ref !== canonical) {
      navigate(location.pathname.replace(`/univers/${ref}`, `/univers/${canonical}`) + location.search, { replace: true });
    }
  }, [universe, ref, navigate, location.pathname, location.search]);

  useEffect(() => {
    document.title = universe ? `${universe.name} · Almanach` : 'Almanach';
    return () => {
      document.title = 'Almanach';
    };
  }, [universe]);

  // Tiroir mobile : fermeture avec Échap
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  if (!id || error?.status === 404) {
    return (
      <div className={page.centered}>
        <EmptyState icon={CircleAlert} title="Univers introuvable" action={<Button as={Link} to="/" variant="primary">Retour aux univers</Button>}>
          Cet univers n’existe pas ou a été supprimé.
        </EmptyState>
      </div>
    );
  }
  if (isPending) return <Spinner className={page.fullHeight} label="Ouverture de l’univers…" />;
  if (error) {
    return (
      <div className={page.centered}>
        <EmptyState icon={CircleAlert} title="Impossible d’ouvrir l’univers">{error.message}</EmptyState>
      </div>
    );
  }

  const backdrop = universeBackdropStyle(universe);
  const base = `/univers/${universeRef(universe)}`;

  const theme = universeThemeProps(universe);

  return (
    // Le thème est aussi transmis aux icônes (voir components/ui/icons.jsx)
    <ThemeKeyContext value={theme['data-theme']}>
      <div {...theme} className={styles.root}>
        {backdrop && <div aria-hidden className={styles.backdrop} style={backdrop} />}
        <div className={cx(styles.shell, backdrop && styles.scrim)}>
          <UniverseSidebar universe={universe} open={menuOpen} onClose={() => setMenuOpen(false)} />

          <div className={styles.main}>
            <header className={styles.topbar}>
              <Button
                variant="ghost"
                iconOnly
                icon={Menu}
                aria-label="Ouvrir le menu"
                aria-expanded={menuOpen}
                aria-controls="universe-sidebar"
                onClick={() => setMenuOpen(true)}
              />
              <Link to={base} className={styles.topbarIdentity}>
                <UniverseAvatar universe={universe} className={styles.topbarAvatar} />
                <span className={styles.topbarName}>{universe.name}</span>
              </Link>
            </header>
            <Outlet context={{ universe }} />
          </div>
        </div>
      </div>
    </ThemeKeyContext>
  );
}
