import { ChevronDown, Plus } from '@/components/ui/icons';
import { Menu } from '@/components/ui/Menu';
import { Select } from '@/components/ui/Select';
import { cx } from '@/components/ui/cx';
import { TEMPORAL, formOptions } from './characterForms';
import styles from './CharacterFormSwitcher.module.scss';

/**
 * Choix de la forme affichée ou éditée. Première ligne : la forme par défaut (le présent) et les transformations ;
 * à la suite, une liste déroulante des époques, de la plus récente à la plus ancienne.
 * `value` : id de la forme ('' = forme par défaut).
 * `onAdd(formType)` : bouton « Ajouter une forme » (édition) ; `actions` : boutons supplémentaires (« Faire évoluer »).
 */
export function CharacterFormSwitcher({ character, value, onChange, onAdd, adding = false, addDisabled = false, addTitle, actions, className }) {
  const { present, past } = formOptions(character);
  if (present.length + past.length < 2 && !onAdd) return null;
  const current = String(value ?? '');
  const pastRecentFirst = [...past].reverse();
  const inPast = past.some((o) => o.value === current);

  const pill = (o) => (
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
  );

  return (
    <div className={cx(styles.switcher, className)}>
      <div role="radiogroup" aria-label="Forme du personnage" className={styles.options}>
        {present.map(pill)}
      </div>
      {past.length > 0 && (
        <Select
          compact
          aria-label="Époque"
          className={cx(styles.past, inPast && styles.pastActive)}
          options={pastRecentFirst}
          value={inPast ? current : ''}
          placeholder={`Époques (${past.length})`}
          onChange={(v) => v && v !== current && onChange(v)}
        />
      )}
      {onAdd && (
        <Menu
          align="start"
          items={[
            { label: 'Transformation', onSelect: () => onAdd('transformation') },
            { label: 'Époque', onSelect: () => onAdd(TEMPORAL) },
          ]}
          trigger={(props) => (
            <button type="button" {...props} className={cx(styles.option, styles.add)} disabled={adding || addDisabled} title={addTitle}>
              <Plus aria-hidden /> {adding ? 'Ajout…' : 'Ajouter une forme'} <ChevronDown aria-hidden />
            </button>
          )}
        />
      )}
      {actions}
    </div>
  );
}
