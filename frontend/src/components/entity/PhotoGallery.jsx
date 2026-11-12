import { useRef, useState } from 'react';
import { X } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import styles from './PhotoGallery.module.scss';

/** Album photo en grille (lecture seule), avec les légendes ; un clic ouvre la photo en grand. */
export function PhotoGallery({ photos, name }) {
  const ref = useRef(null);
  const [current, setCurrent] = useState(null);
  const open = (photo) => {
    setCurrent(photo);
    ref.current?.showModal();
  };

  return (
    <>
      <ul className={styles.album}>
        {photos.map((p, i) => (
          <li key={p.id}>
            <figure className={styles.figure}>
              <button type="button" className={styles.photo} onClick={() => open(p)} aria-label={p.caption ? `Agrandir : ${p.caption}` : `Agrandir la photo ${i + 1}`}>
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
        aria-label={`Photo de ${name}`}
        onClick={() => ref.current?.close()}
        onClose={() => setCurrent(null)}
      >
        {current && (
          <figure className={styles.lightboxFigure}>
            <img src={uploadUrl(current.imagePath)} alt={current.caption || `Photo de ${name}`} />
            {current.caption && <figcaption className={styles.lightboxCaption}>{current.caption}</figcaption>}
          </figure>
        )}
        <button type="button" className={styles.lightboxClose} aria-label="Fermer">
          <X aria-hidden />
        </button>
      </dialog>
    </>
  );
}
