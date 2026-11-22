import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Ajuste la hauteur d'une zone de texte à son contenu, lignes repliées comprises (pas seulement les retours à la ligne).
 * Au-delà de sa `max-height` (CSS), la zone défile.
 */
export function fitHeight(el) {
  if (!el) return;
  el.style.height = 'auto';
  // border-box : la hauteur inclut les bordures, scrollHeight non
  el.style.height = `${el.scrollHeight + el.offsetHeight - el.clientHeight}px`;
}

/**
 * Garde à la bonne hauteur les zones de texte renvoyées par `getElements()` : à chaque rendu (texte modifié)
 * et quand la fenêtre change de largeur (les lignes se replient autrement).
 */
export function useAutoGrow(getElements) {
  const latest = useRef(getElements);
  useLayoutEffect(() => {
    latest.current = getElements;
    for (const el of getElements()) fitHeight(el);
  });
  useEffect(() => {
    const onResize = () => {
      for (const el of latest.current()) fitHeight(el);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
}
