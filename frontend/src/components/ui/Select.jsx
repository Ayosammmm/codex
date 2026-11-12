import { ChevronDown } from '@/components/ui/icons';
import { cx } from './cx';
import styles from './Select.module.scss';

/**
 * Liste déroulante native stylée.
 * options : [{ value, label, color? }] — `placeholder` ajoute une option vide (valeur '').
 * Si l'option choisie a une couleur, une pastille est affichée.
 */
export function Select({ options, value, onChange, placeholder, compact = false, className, ...props }) {
  const current = options.find((o) => String(o.value) === String(value ?? ''));
  return (
    <div className={cx(styles.wrap, current?.color && styles.withDot, compact && styles.compact, className)}>
      {current?.color && <span className={styles.dot} style={{ background: current.color }} aria-hidden />}
      <select className={styles.select} value={value ?? ''} onChange={(e) => onChange(e.target.value)} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className={styles.chevron} aria-hidden />
    </div>
  );
}
