import { useId } from 'react';
import { cx } from './cx';
import styles from './Field.module.scss';

/**
 * Libellé + aide + erreur autour d'un champ.
 * `children` reçoit les props d'accessibilité à poser sur le contrôle : {id, 'aria-describedby', 'aria-invalid'}.
 */
export function Field({ label, hint, error, required, className, children }) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cx(styles.field, className)}>
      {label && (
        <label htmlFor={id} className={styles.label}>
          {label}
          {required && <span className={styles.required} aria-hidden> *</span>}
        </label>
      )}
      {children({ id, 'aria-describedby': describedBy, 'aria-invalid': error ? true : undefined, required })}
      {hint && !error && <p id={hintId} className={styles.hint}>{hint}</p>}
      {error && <p id={errorId} className={styles.error}>{error}</p>}
    </div>
  );
}

export function Input({ className, ...props }) {
  return <input className={cx(styles.input, className)} {...props} />;
}

export function Textarea({ className, rows = 4, ...props }) {
  return <textarea rows={rows} className={cx(styles.input, className)} {...props} />;
}
