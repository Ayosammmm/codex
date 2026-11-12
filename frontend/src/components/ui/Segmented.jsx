import { cx } from './cx';
import styles from './Segmented.module.scss';

/**
 * Choix exclusif sous forme de boutons accolés (role="radiogroup").
 * options : [{ value, label, icon? }] — `iconOnly` n'affiche que les icônes (libellé en infobulle).
 */
export function Segmented({ options, value, onChange, label, iconOnly = false, className }) {
  const onKeyDown = (e) => {
    const index = options.findIndex((o) => o.value === value);
    const delta = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
    if (!delta) return;
    e.preventDefault();
    const next = options[(index + delta + options.length) % options.length];
    onChange(next.value);
    e.currentTarget.querySelector(`[data-value="${next.value}"]`)?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className={cx(styles.group, className)} onKeyDown={onKeyDown}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          data-value={o.value}
          aria-checked={o.value === value}
          tabIndex={o.value === value ? 0 : -1}
          title={iconOnly ? o.label : undefined}
          onClick={() => onChange(o.value)}
          className={cx(styles.option, iconOnly && styles.iconOnly)}
        >
          {o.icon && <o.icon aria-hidden />}
          <span className={iconOnly ? 'sr-only' : undefined}>{o.label}</span>
        </button>
      ))}
    </div>
  );
}
