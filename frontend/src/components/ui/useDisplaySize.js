import { useLayoutEffect, useState } from 'react';

/**
 * Taille affichée (px CSS) d'un élément, pour charger une image à la bonne taille : { width, height }.
 * Mesurée avant le premier rendu à l'écran, puis suivie (ne fait que grandir : pas de rechargement en rétrécissant).
 * 0 × 0 tant que l'élément n'est pas affiché.
 */
export function useDisplaySize(ref) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    // offsetWidth/offsetHeight : taille de mise en page, sans les transformations (zoom d'animation…)
    const update = () => {
      const { offsetWidth: w, offsetHeight: h } = el;
      if (!w) return;
      setSize((prev) => (w <= prev.width && h <= prev.height ? prev : { width: Math.max(prev.width, w), height: Math.max(prev.height, h) }));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}
