import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, X } from '@/components/ui/icons';
import styles from './Lightbox.module.scss';

// Distance minimale (px) d'un glissé horizontal pour changer d'image
const SWIPE = 50;

/**
 * Visionneuse plein écran : image centrée (taille d'origine), légende, précédente / suivante
 * (boutons, flèches du clavier, glissé) quand il y a plusieurs images.
 * `images` : [{ key, src, alt, caption }]. `index` : image affichée, `null` = fermée.
 * `onIndexChange(i | null)` : navigation ou fermeture.
 */
export function Lightbox({ images, index, onIndexChange, label }) {
  const ref = useRef(null);
  const swipeStart = useRef(null);
  const swiped = useRef(false);
  const count = images.length;
  const current = index == null ? null : images[index];

  // Ouverture / fermeture du <dialog> selon `index`
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (index != null && !dialog.open) dialog.showModal();
    else if (index == null && dialog.open) dialog.close();
  }, [index]);

  // Précharge les images voisines pour une navigation sans attente
  useEffect(() => {
    if (index == null || count < 2) return;
    [images[(index + 1) % count], images[(index - 1 + count) % count]].forEach((img) => {
      new Image().src = img.src;
    });
  }, [index, images, count]);

  const close = () => ref.current?.close();
  // Boucle : après la dernière, on revient à la première
  const go = (step) => index != null && onIndexChange((index + step + count) % count);

  const onKeyDown = (e) => {
    if (count < 2) return;
    if (e.key === 'ArrowRight') go(1);
    else if (e.key === 'ArrowLeft') go(-1);
    else return;
    e.preventDefault();
  };

  const onPointerDown = (e) => {
    swiped.current = false;
    swipeStart.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerUp = (e) => {
    const start = swipeStart.current;
    swipeStart.current = null;
    if (!start || count < 2) return;
    const dx = e.clientX - start.x;
    if (Math.abs(dx) > SWIPE && Math.abs(dx) > Math.abs(e.clientY - start.y)) {
      swiped.current = true;
      go(dx < 0 ? 1 : -1);
    }
  };

  // Un clic sur le fond ferme ; un clic sur l'image ou les boutons, non
  const stop = (e) => e.stopPropagation();

  return (
    <dialog
      ref={ref}
      className={styles.lightbox}
      aria-label={label}
      onClick={() => {
        // Le clic qui suit un glissé ne ferme pas la visionneuse
        if (swiped.current) swiped.current = false;
        else close();
      }}
      onClose={() => onIndexChange(null)}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
    >
      {current && (
        <>
          <figure className={styles.lightboxFigure}>
            <img key={current.key} src={current.src} alt={current.alt} onClick={stop} draggable={false} />
            {current.caption && (
              <figcaption className={styles.lightboxCaption} onClick={stop}>
                {current.caption}
              </figcaption>
            )}
          </figure>

          {count > 1 && (
            <>
              <button type="button" className={`${styles.lightboxButton} ${styles.lightboxPrev}`} aria-label="Image précédente" onClick={(e) => (stop(e), go(-1))}>
                <ChevronLeft aria-hidden />
              </button>
              <button type="button" className={`${styles.lightboxButton} ${styles.lightboxNext}`} aria-label="Image suivante" onClick={(e) => (stop(e), go(1))}>
                <ChevronRight aria-hidden />
              </button>
              <p className={styles.lightboxCounter} aria-live="polite">
                {index + 1} / {count}
              </p>
            </>
          )}
        </>
      )}
      <button type="button" className={`${styles.lightboxButton} ${styles.lightboxClose}`} aria-label="Fermer" onClick={(e) => (stop(e), close())}>
        <X aria-hidden />
      </button>
    </dialog>
  );
}
