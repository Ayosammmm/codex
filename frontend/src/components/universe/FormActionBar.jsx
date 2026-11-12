import { cx } from '@/components/ui/cx';
import styles from './FormActionBar.module.scss';

/** Barre d'actions collée en bas de l'écran pour les formulaires longs. */
export function FormActionBar({ visible = true, message, children }) {
  return (
    <div className={cx(styles.bar, !visible && styles.hidden)} aria-hidden={!visible || undefined}>
      <div className={styles.inner}>
        {message && <p className={styles.message}>{message}</p>}
        {children}
      </div>
    </div>
  );
}
