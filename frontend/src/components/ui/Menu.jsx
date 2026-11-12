import { useEffect, useId, useRef, useState } from 'react';
import { cx } from './cx';
import styles from './Menu.module.scss';

/**
 * Menu déroulant simple et accessible (navigation au clavier, fermeture au clic extérieur / Échap).
 * items : [{ label, icon, onSelect, danger, separator }] ; placement : 'bottom' | 'top' (au-dessus du déclencheur)
 */
export function Menu({ trigger, items, align = 'end', placement = 'bottom' }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointer = (e) => !rootRef.current?.contains(e.target) && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    rootRef.current?.querySelector('[role="menuitem"]')?.focus();
    return () => document.removeEventListener('pointerdown', onPointer);
  }, [open]);

  const onKeyDown = (e) => {
    const entries = [...(rootRef.current?.querySelectorAll('[role="menuitem"]') || [])];
    const index = entries.indexOf(document.activeElement);
    if (e.key === 'Escape') {
      setOpen(false);
      rootRef.current?.querySelector('[aria-haspopup]')?.focus();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      entries[(index + 1) % entries.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      entries[(index - 1 + entries.length) % entries.length]?.focus();
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={styles.root} onKeyDown={onKeyDown}>
      {trigger({
        'aria-haspopup': 'menu',
        'aria-expanded': open,
        'aria-controls': open ? menuId : undefined,
        onClick: (e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen((o) => !o);
        },
      })}
      {open && (
        <div
          id={menuId}
          role="menu"
          className={cx(styles.menu, align === 'end' ? styles.alignEnd : styles.alignStart, placement === 'top' && styles.top)}
        >
          {items.filter(Boolean).map((item, i) =>
            item.separator ? (
              <div key={`sep-${i}`} role="separator" className={styles.separator} />
            ) : (
              <button
                key={item.label}
                type="button"
                role="menuitem"
                tabIndex={-1}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setOpen(false);
                  item.onSelect();
                }}
                className={cx(styles.item, item.danger && styles.danger)}
              >
                {item.icon && <item.icon aria-hidden />}
                {item.label}
              </button>
            ),
          )}
        </div>
      )}
    </div>
  );
}
