import { useState } from 'react';
import { IMG, uploadUrl } from '@/api/client';
import { Lightbox } from './Lightbox';
import styles from './PhotoGallery.module.scss';

/**
 * Album photo en grille (lecture seule), avec les légendes.
 * Un clic ouvre la visionneuse : photo centrée, précédente / suivante (boutons, flèches du clavier, glissé).
 */
export function PhotoGallery({ photos, name }) {
  const [index, setIndex] = useState(null);
  // Album modifié pendant la visionneuse : on reste dans les bornes
  if (index != null && index >= photos.length) setIndex(photos.length ? photos.length - 1 : null);
  const images = photos.map((p) => ({ key: p.id, src: uploadUrl(p.imagePath), alt: p.caption || `Photo de ${name}`, caption: p.caption }));

  return (
    <>
      <ul className={styles.album}>
        {photos.map((p, i) => (
          <li key={p.id}>
            <figure className={styles.figure}>
              <button type="button" className={styles.photo} onClick={() => setIndex(i)} aria-label={p.caption ? `Agrandir : ${p.caption}` : `Agrandir la photo ${i + 1}`}>
                <img src={uploadUrl(p.imagePath, IMG.card)} alt={p.caption || ''} loading="lazy" decoding="async" />
              </button>
              {p.caption && <figcaption className={styles.caption}>{p.caption}</figcaption>}
            </figure>
          </li>
        ))}
      </ul>
      <Lightbox images={images} index={index} onIndexChange={setIndex} label={`Photos de ${name}`} />
    </>
  );
}
