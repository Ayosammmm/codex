import { cx } from './cx';
import styles from './Badge.module.scss';

/** Étiquette avec pastille, teintée par `color` (couleur d'un genre, d'un statut...). */
export function Badge({ color, children, className, title }) {
  return (
    <span className={cx(styles.badge, className)} style={color ? { '--badge-color': color } : undefined} title={title}>
      <span className={styles.dot} aria-hidden />
      <span className={styles.label}>{children}</span>
    </span>
  );
}
