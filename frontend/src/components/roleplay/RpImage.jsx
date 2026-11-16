import { useRef } from 'react';
import { X } from '@/components/ui/icons';
import { uploadUrl } from '@/api/client';
import styles from './Roleplay.module.scss';

/** Image envoyée dans un fil : vignette ; un clic l'ouvre en grand (Échap ou clic pour fermer). */
export function RpImage({ path, alt = 'Image envoyée' }) {
  const ref = useRef(null);
  const src = uploadUrl(path);
  return (
    <>
      <button type="button" className={styles.imageButton} onClick={() => ref.current?.showModal()} aria-label="Agrandir l’image">
        <img src={src} alt={alt} loading="lazy" decoding="async" className={styles.messageImage} />
      </button>
      <dialog ref={ref} className={styles.viewer} onClick={() => ref.current?.close()} aria-label={alt}>
        <img src={src} alt={alt} />
        <button type="button" className={styles.viewerClose} aria-label="Fermer">
          <X aria-hidden />
        </button>
      </dialog>
    </>
  );
}
