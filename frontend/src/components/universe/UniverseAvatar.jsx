import { uploadUrl } from '@/api/client';
import { initials } from '@/utils/universe';
import { cx } from '@/components/ui/cx';
import styles from './UniverseAvatar.module.scss';

/**
 * Logo de l'univers, ou ses initiales sur la couleur principale. Doit être rendu dans le thème de l'univers.
 * La taille (largeur, hauteur, taille de police) est donnée par `className`.
 */
export function UniverseAvatar({ universe, src, className }) {
  const image = src !== undefined ? src : uploadUrl(universe?.logo);
  return (
    <span className={cx(styles.avatar, className)}>
      {image ? <img src={image} alt="" className={styles.image} /> : <span className={styles.initials}>{initials(universe?.name)}</span>}
    </span>
  );
}
