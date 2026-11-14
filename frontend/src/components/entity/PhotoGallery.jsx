import { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import styles from './PhotoGallery.module.scss';

// Distance minimale (px) d'un glissé horizontal pour changer de photo
const SWIPE = 50;

/**
 * Album photo en grille (lecture seule), avec les légendes.
 * Un clic ouvre la visionneuse : photo centrée, précédente / suivante (boutons, flèches du clavier, glissé).
 */
export function PhotoGallery({ photos, name }) {
  const ref = useRef(null);
  const swipeStart = useRef(null);
  const swiped = useRef(false);
  const [index, setIndex] = useState(null);
  const count = photos.length;
  const current = index == null ? null : photos[index];

  const open = (i) => {
    setIndex(i);
    ref.current?.showModal();
  };
  const close = () => ref.current?.close();
  // Boucle : après la dernière, on revient à la première
  const go = (step) => setIndex((i) => (i == null ? i : (i + step + count) % count));

  // Album modifié pendant la visionneuse : on reste dans les bornes
  if (index != null && index >= count) setIndex(count ? count - 1 : null);

  // Précharge les photos voisines pour une navigation sans attente
  useEffect(() => {
    if (index == null || count < 2) return;
    [photos[(index + 1) % count], photos[(index - 1 + count) % count]].forEach((p) => {
      new Image().src = uploadUrl(p.imagePath);
    });
  }, [index, photos, count]);

  const onKeyDown = (e) => {
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

  // Un clic sur le fond ferme ; un clic sur la photo ou les boutons, non
  const stop = (e) => e.stopPropagation();

  return (
    <>
      <ul className={styles.album}>
        {photos.map((p, i) => (
          <li key={p.id}>
            <figure className={styles.figure}>
              <button type="button" className={styles.photo} onClick={() => open(i)} aria-label={p.caption ? `Agrandir : ${p.caption}` : `Agrandir la photo ${i + 1}`}>
                <img src={uploadUrl(p.imagePath)} alt={p.caption || ''} loading="lazy" decoding="async" />
              </button>
              {p.caption && <figcaption className={styles.caption}>{p.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>
      <dialog
        ref={ref}
        className={styles.lightbox}
        aria-label={`Photos de ${name}`}
        onClick={() => {
          // Le clic qui suit un glissé ne ferme pas la visionneuse
          if (swiped.current) swiped.current = false;
          else close();
        }}
        onClose={() => setIndex(null)}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
      >
        {current && (
          <>
            <figure className={styles.lightboxFigure}>
              <img key={current.id} src={uploadUrl(current.imagePath)} alt={current.caption || `Photo de ${name}`} onClick={stop} draggable={false} />
              {current.caption && (
                <figcaption className={styles.lightboxCaption} onClick={stop}>
                  {current.caption}
                </figcaption>
              )}
            </figure>

            {count > 1 && (
              <>
                <button type="button" className={`${styles.lightboxButton} ${styles.lightboxPrev}`} aria-label="Photo précédente" onClick={(e) => (stop(e), go(-1))}>
                  <ChevronLeft aria-hidden />
                </button>
                <button type="button" className={`${styles.lightboxButton} ${styles.lightboxNext}`} aria-label="Photo suivante" onClick={(e) => (stop(e), go(1))}>
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
    </>
  );
}
