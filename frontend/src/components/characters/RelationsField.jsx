import { Plus, Trash2 } from '@/components/ui/icons';
import { RELATION_CATEGORIES, RELATION_NATURES, RELATION_TONES, characterName, relationCategory, relationNature } from '@/config/characters';
import { Button } from '@/components/ui/Button';
import { Combobox } from '@/components/ui/Combobox';
import { Switch } from '@/components/ui/Switch';
import { cx } from '@/components/ui/cx';
import { CharacterAvatar } from './CharacterAvatar';
import styles from './RelationsField.module.scss';

/**
 * Relations avec d'autres personnages : [{ key, characterId, relationType, category, lead, tone, evolving }].
 * - archétype (familiale, amoureuse...) puis nature, dans une liste fermée (config/characters.js)
 * - natures à deux rôles (Parent / Enfant...) : `lead` dit qui tient le premier rôle, ce personnage ('self') ou l'autre ('other')
 * - ton : -2 à +2 (c'est lui qui dit si la relation est positive ou non) ; évolution : figée ou au fil du récit
 * `selfName` : nom du personnage de la fiche, pour le choix des rôles.
 */
export function RelationsField({ value, onChange, characterOptions, charactersById, selfId, selfName, errors = {}, newKey }) {
  const updateRow = (key, patch) => onChange(value.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const removeRow = (key) => onChange(value.filter((r) => r.key !== key));
  const addRow = () =>
    onChange([...value, { key: newKey(), characterId: null, relationType: '', category: '', lead: null, tone: null, evolving: false }]);

  return (
    <div className={styles.list}>
      {value.length === 0 && <p className={styles.empty}>Aucune relation pour le moment.</p>}

      {value.map((row, i) => {
        // On ne propose ni le personnage lui-même, ni ceux déjà liés dans une autre ligne
        const taken = new Set(value.filter((r) => r.key !== row.key).map((r) => r.characterId));
        const options = characterOptions.filter((o) => o.value !== selfId && !taken.has(o.value));
        const category = relationCategory(row.category);
        const nature = relationNature(row.relationType);
        const natures = RELATION_NATURES.filter((n) => n.category === row.category);
        const other = charactersById.get(row.characterId);
        const otherName = other ? characterName(other) : 'L’autre personnage';
        const error = errors[`relation-${i}`];
        return (
          <div key={row.key} className={styles.row} style={{ '--category': category?.color || 'var(--border-strong)' }}>
            <div className={styles.head}>
              <CharacterAvatar character={other} round className={styles.avatar} />
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

            <PillGroup
              legend="Archétype"
              name={`archetype-${row.key}`}
              options={RELATION_CATEGORIES.map((c) => ({ value: c.value, label: c.label, color: c.color }))}
              value={row.category}
              // Changer d'archétype efface la nature, qui n'en fait plus partie
              onChange={(c) => updateRow(row.key, { category: c, ...(nature?.category !== c && { relationType: '', lead: null }) })}
            />

            {/* Ancienne nature en texte libre, hors de la liste : à remplacer */}
            {row.relationType && !nature && (
              <p className={styles.legacy}>
                Nature actuelle : « {row.relationType} ». Choisissez-en une dans la liste pour la remplacer.
              </p>
            )}

            {category ? (
              <PillGroup
                legend="Nature"
                name={`nature-${row.key}`}
                options={natures.map((n) => ({ value: n.key, label: n.label, color: category.color }))}
                value={nature?.key || ''}
                onChange={(key) => updateRow(row.key, { relationType: key, lead: null })}
                invalid={Boolean(error) && !nature}
              />
            ) : (
              <p className={styles.hint}>Choisissez un archétype pour voir les natures de relation.</p>
            )}

            {nature?.roles && (
              <PillGroup
                legend="Qui est qui ?"
                name={`roles-${row.key}`}
                options={[
                  { value: 'self', label: roleLabel(selfName, nature.roles[0], otherName, nature.roles[1]) },
                  { value: 'other', label: roleLabel(selfName, nature.roles[1], otherName, nature.roles[0]) },
                ]}
                value={row.lead || ''}
                onChange={(lead) => updateRow(row.key, { lead: lead || null })}
                invalid={Boolean(error) && !row.lead}
              />
            )}

            {error && <p className={styles.error}>{error}</p>}

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

/** « Alice : Parent · Bob : Enfant » */
const roleLabel = (selfName, selfRole, otherName, otherRole) => `${selfName} : ${selfRole} · ${otherName} : ${otherRole}`;

/**
 * Pastilles à choix unique (boutons radio stylés) ; un nouveau clic sur la valeur choisie l'efface.
 * `options` : [{ value, label, color? }]
 */
function PillGroup({ legend, name, options, value, onChange, invalid = false }) {
  return (
    <fieldset className={styles.categories} aria-invalid={invalid || undefined}>
      <legend className={styles.label}>{legend}</legend>
      <div className={styles.pills}>
        {options.map((o) => {
          const selected = value === o.value;
          return (
            <label
              key={o.value}
              className={cx(styles.pill, selected && styles.pillSelected, invalid && styles.pillInvalid)}
              style={{ '--pill': o.color || 'var(--primary)' }}
            >
              <input
                type="radio"
                name={name}
                checked={selected}
                onChange={() => onChange(o.value)}
                onClick={() => selected && onChange('')}
              />
              {o.label}
            </label>
          );
        })}
      </div>
    </fieldset>
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
          return (
            <label key={o.value} className={cx(styles.scaleOption, selected && styles.scaleLit)} style={o.color ? { '--tone': o.color } : undefined} title={o.label}>
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
