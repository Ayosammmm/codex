import { useEffect, useId, useRef } from 'react';
import { X } from '@/components/ui/icons';
import { Button } from './Button';
import { cx } from './cx';
import styles from './Dialog.module.scss';

/**
 * Fenêtre modale basée sur <dialog> (focus, Échap et top layer gérés par le navigateur).
 * Rendue sur place (sans portail) : elle hérite donc du thème de l'univers courant.
 */
export function Dialog({ open, onClose, title, description, children, footer, size = 'md', dismissible = true }) {
  const ref = useRef(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onCancel={(e) => {
        e.preventDefault();
        if (dismissible) onClose();
      }}
      onClick={(e) => {
        if (dismissible && e.target === ref.current) onClose();
      }}
      aria-labelledby={titleId}
      className={cx(styles.dialog, size === 'sm' && styles.small)}
    >
      {open && (
        <>
          <header className={styles.header}>
            <div>
              <h2 id={titleId} className={styles.title}>{title}</h2>
              {description && <p className={styles.description}>{description}</p>}
            </div>
            {dismissible && <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Fermer" onClick={onClose} />}
          </header>
          {children && <div className={styles.body}>{children}</div>}
          {footer && <footer className={styles.footer}>{footer}</footer>}
        </>
      )}
    </dialog>
  );
}
