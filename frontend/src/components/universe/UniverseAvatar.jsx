import { useRef } from 'react';
import { uploadUrl } from '@/api/client';
import { initials } from '@/utils/universe';
import { cx } from '@/components/ui/cx';
import { useDisplaySize } from '@/components/ui/useDisplaySize';
import styles from './UniverseAvatar.module.scss';

/**
 * Logo de l'univers, ou ses initiales sur la couleur principale. Doit être rendu dans le thème de l'univers.
 * La taille (largeur, hauteur, taille de police) est donnée par `className`.
 */
export function UniverseAvatar({ universe, src, className }) {
  const ref = useRef(null);
  // Image en object-fit: cover : elle doit couvrir la largeur ET la hauteur du cadre
  const { width, height } = useDisplaySize(ref);
  const image = src !== undefined ? src : width ? uploadUrl(universe?.logo, width, height) : null;
  return (
    <span ref={ref} className={cx(styles.avatar, className)}>
      {image ? <img src={image} alt="" className={styles.image} /> : <span className={styles.initials}>{initials(universe?.name)}</span>}
    </span>
  );
}
