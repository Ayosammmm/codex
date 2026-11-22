import { Plus } from '@/components/ui/icons';
import { cx } from '@/components/ui/cx';
import { formOptions } from './characterForms';
import styles from './CharacterFormSwitcher.module.scss';

/**
 * Choix de la forme affichée ou éditée (transformations, changements physiques).
 * `value` : id de la forme ('' = forme par défaut) ; `onAdd` : bouton « Ajouter une forme » (édition).
 */
export function CharacterFormSwitcher({ character, value, onChange, onAdd, adding = false, addDisabled = false, addTitle, className }) {
  const options = formOptions(character);
  if (options.length < 2 && !onAdd) return null;
  const current = String(value ?? '');
  return (
    <div className={cx(styles.switcher, className)}>
      <div role="radiogroup" aria-label="Forme du personnage" className={styles.options}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === current}
            onClick={() => o.value !== current && onChange(o.value)}
            className={styles.option}
          >
            {o.label}
          </button>
        ))}
      </div>
      {onAdd && (
        <button type="button" className={cx(styles.option, styles.add)} onClick={onAdd} disabled={adding || addDisabled} title={addTitle}>
          <Plus aria-hidden /> {adding ? 'Ajout…' : 'Ajouter une forme'}
        </button>
      )}
    </div>
  );
}
