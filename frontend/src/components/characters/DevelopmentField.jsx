import { DEVELOPMENT_TYPES, developmentType } from '@/config/characters';
import { Field } from '@/components/ui/Field';
import { RichTextEditor } from '@/components/ui/RichText';
import { Segmented } from '@/components/ui/Segmented';
import styles from './DevelopmentField.module.scss';

const OPTIONS = [{ value: '', label: 'Non précisé' }, ...DEVELOPMENT_TYPES.map((d) => ({ value: d.value, label: d.label }))];

/**
 * Personnage statique ou dynamique (notes Obsidian « Personnalité »),
 * avec la description de son évolution (ou de ce qui le rend immuable).
 */
export function DevelopmentField({ value, note, onChange, onNoteChange }) {
  const type = developmentType(value);
  return (
    <div className={styles.root}>
      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>Évolution du personnage</legend>
        <Segmented label="Évolution du personnage" options={OPTIONS} value={value} onChange={onChange} />
        <p className={styles.hint}>{type ? type.hint : 'Un personnage statique reste le même ; un personnage dynamique évolue au fil du récit.'}</p>
      </fieldset>
      {value && (
        <Field label={value === 'dynamique' ? 'Son évolution' : 'Ce qui le rend immuable'}>
          {(props) => (
            <RichTextEditor
              {...props}
              label={value === 'dynamique' ? 'Son évolution' : 'Ce qui le rend immuable'}
              minHeight="5rem"
              value={note}
              onChange={onNoteChange}
            />
          )}
        </Field>
      )}
    </div>
  );
}
