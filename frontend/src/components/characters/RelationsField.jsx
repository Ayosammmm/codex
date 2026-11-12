import { Plus, Trash2 } from '@/components/ui/icons';
import { RELATION_CATEGORIES, RELATION_TONES, relationCategory } from '@/config/characters';
import { Autocomplete } from '@/components/ui/Autocomplete';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Switch } from '@/components/ui/Switch';
import { cx } from '@/components/ui/cx';
import { CharacterAvatar } from './CharacterAvatar';
import styles from './RelationsField.module.scss';

/** Natures suggérées, regroupées par archétype : celles de l'archétype choisi, sinon de tous. */
function natureSuggestions(category) {
  const categories = category ? RELATION_CATEGORIES.filter((c) => c.value === category) : RELATION_CATEGORIES;
  return categories.flatMap((c) => c.suggestions.map((value) => ({ value, group: c.label, color: c.color, category: c.value })));
}

/**
 * Relations avec d'autres personnages : [{ key, characterId, relationType, category, tone, evolving }].
 * - archétype : familiale, amoureuse... (pastilles) ; nature : texte libre avec suggestions
 *   (choisir une suggestion d'un autre archétype règle aussi l'archétype)
 * - ton : -2 à +2 ; évolution : relation figée ou qui évolue au fil du récit
 */
export function RelationsField({ value, onChange, characterOptions, charactersById, selfId, errors = {}, newKey }) {
  const updateRow = (key, patch) => onChange(value.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const removeRow = (key) => onChange(value.filter((r) => r.key !== key));
  const addRow = () =>
    onChange([...value, { key: newKey(), characterId: null, relationType: '', category: '', tone: null, evolving: false }]);

  return (
    <div className={styles.list}>
      {value.length === 0 && <p className={styles.empty}>Aucune relation pour le moment.</p>}

      {value.map((row, i) => {
        // On ne propose ni le personnage lui-même, ni ceux déjà liés dans une autre ligne
        const taken = new Set(value.filter((r) => r.key !== row.key).map((r) => r.characterId));
        const options = characterOptions.filter((o) => o.value !== selfId && !taken.has(o.value));
        const category = relationCategory(row.category);
        return (
          <div key={row.key} className={styles.row} style={{ '--category': category?.color || 'var(--border-strong)' }}>
            <div className={styles.head}>
              <CharacterAvatar character={charactersById.get(row.characterId)} round className={styles.avatar} />
              <div className={styles.character}>
                <Combobox
                  options={options}
                  value={row.characterId}
                  onChange={(characterId) => updateRow(row.key, { characterId })}
                  placeholder="Choisir un personnage…"
                  aria-label={`Personnage lié ${i + 1}`}
                />
              </div>
              <Button variant="danger-ghost" iconOnly icon={Trash2} aria-label={`Retirer la relation ${i + 1}`} onClick={() => removeRow(row.key)} />
            </div>

            <fieldset className={styles.categories}>
              <legend className={styles.label}>Archétype</legend>
              <div className={styles.pills}>
                {RELATION_CATEGORIES.map((c) => {
                  const selected = row.category === c.value;
                  return (
                    <label key={c.value} className={cx(styles.pill, selected && styles.pillSelected)} style={{ '--pill': c.color }}>
                      <input
                        type="radio"
                        name={`archetype-${row.key}`}
                        checked={selected}
                        onChange={() => updateRow(row.key, { category: c.value })}
                        onClick={() => selected && updateRow(row.key, { category: '' })}
                      />
                      {c.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <div className={styles.nature}>
              <span className={styles.label} id={`nature-${row.key}`}>
                Nature
              </span>
              <Autocomplete
                value={row.relationType}
                onChange={(relationType) => updateRow(row.key, { relationType })}
                onPick={(s) => s.category && !row.category && updateRow(row.key, { relationType: s.value, category: s.category })}
                suggestions={natureSuggestions(row.category)}
                placeholder={category ? `Ex. ${category.suggestions[0]}…` : 'Ex. Mentor / Élève, Ex, Rivalité…'}
                aria-label={`Nature de la relation ${i + 1}`}
                aria-invalid={errors[`relation-${i}`] ? true : undefined}
              />
              {errors[`relation-${i}`] && <p className={styles.error}>{errors[`relation-${i}`]}</p>}
            </div>

            <div className={styles.details}>
              <Scale
                label="Ton"
                options={RELATION_TONES.map((o) => ({ ...o, text: o.short }))}
                value={row.tone}
                onChange={(tone) => updateRow(row.key, { tone })}
                name={`ton-${row.key}`}
              />
              <label className={styles.evolving}>
                <Switch checked={row.evolving} onChange={(evolving) => updateRow(row.key, { evolving })} aria-label={`La relation ${i + 1} évolue au fil du récit`} />
                <span>{row.evolving ? 'Évolue au fil du récit' : 'Relation figée'}</span>
              </label>
            </div>
          </div>
        );
      })}

      <Button icon={Plus} size="sm" className={styles.add} onClick={addRow}>
        Ajouter une relation
      </Button>
    </div>
  );
}

/**
 * Échelle à choix unique (boutons radio stylés) ; un nouveau clic sur la valeur choisie l'efface.
 * `options` : [{ value, label, text, color? }]
 */
function Scale({ label, options, value, onChange, name }) {
  return (
    <fieldset className={styles.scale}>
      <legend className={styles.scaleLabel}>
        {label}
        <span className={styles.scaleValue}>{options.find((o) => o.value === value)?.label || 'Non précisé'}</span>
      </legend>
      <div className={styles.scaleOptions}>
        {options.map((o) => {
          const selected = value === o.value;
          const lit = selected;
          return (
            <label key={o.value} className={cx(styles.scaleOption, lit && styles.scaleLit)} style={o.color ? { '--tone': o.color } : undefined} title={o.label}>
              <input
                type="radio"
                name={name}
                checked={selected}
                onChange={() => onChange(o.value)}
                onClick={() => selected && onChange(null)}
                aria-label={o.label}
              />
              <span aria-hidden>{o.text}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
