import { useEffect, useRef } from 'react';
import { Outlet, ScrollRestoration, useLocation, useNavigationType } from 'react-router';

/**
 * Racine : chaque page ouverte par un lien s'affiche en haut ; « Retour » / « Suivant » retrouvent la position.
 * Clé = chemin seul : changer un filtre ou un onglet dans l'URL (?…) ne fait pas bouger la page.
 */
export default function AppRoot() {
  const { pathname } = useLocation();
  const navigationType = useNavigationType();
  // Chemin déjà traité : un simple changement de filtre (`?…`) ne fait pas remonter
  const lastPathname = useRef(pathname);

  // ScrollRestoration remettrait aussi la position d'une page déjà visitée quand on y revient par un lien
  useEffect(() => {
    if (lastPathname.current === pathname) return;
    lastPathname.current = pathname;
    if (navigationType !== 'POP') window.scrollTo(0, 0);
  }, [pathname, navigationType]);

  return (
    <>
      <ScrollRestoration getKey={(location) => location.pathname} />
      <Outlet />
    </>
  );
}
