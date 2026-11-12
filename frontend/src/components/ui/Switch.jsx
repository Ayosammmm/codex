import { cx } from './cx';
import styles from './Switch.module.scss';

/** Interrupteur accessible (role="switch"). */
export function Switch({ checked, onChange, disabled, className, ...props }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cx(styles.switch, className)}
      {...props}
    >
      <span aria-hidden className={styles.thumb} />
    </button>
  );
}
