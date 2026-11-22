import { useState } from 'react';
import { cx } from '@/components/ui/cx';
import { Lightbox } from './Lightbox';
import styles from './ImageZoom.module.scss';

/**
 * Rend `children` (l'image affichée sur la fiche) cliquable : un clic ouvre la visionneuse
 * avec `src`, l'image d'origine en HD (à passer sans largeur à `uploadUrl`).
 * Sans `src`, `children` est rendu tel quel. `label` : nom accessible de l'image.
 * `fill` : le bouton occupe toute la largeur (un <button> ne s'étire pas seul, même en display: block).
 */
export function ImageZoom({ src, label, fill = false, className, children }) {
  const [open, setOpen] = useState(false);
  if (!src) return children;
  return (
    <>
      <button type="button" className={cx(styles.zoom, fill && styles.fill, className)} onClick={() => setOpen(true)} aria-label={`Agrandir : ${label}`}>
        {children}
      </button>
      <Lightbox images={[{ key: src, src, alt: label }]} index={open ? 0 : null} onIndexChange={(i) => setOpen(i != null)} label={label} />
    </>
  );
}
