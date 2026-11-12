import { X } from '@/components/ui/icons';
import { TRAIT_GROUPS, TRAIT_MAX, TRAIT_MIN } from '@/config/characters';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import styles from './TraitsField.module.scss';

const formatValue = (v) => (v == null ? '—' : v > 0 ? `+${v}` : v < 0 ? `−${-v}` : '0');

/**
 * Traits de personnalité : 24 curseurs de -10 (faiblesse) à +10 (force), regroupés par vertu.
 * `value` : { trait_x: number | null } — null = non renseigné.
 */
export function TraitsField({ value, onChange }) {
  const filled = Object.values(value).filter((v) => v != null).length;
  const set = (key, v) => onChange({ ...value, [key]: v });

  return (
    <>
      <div className={styles.intro}>
        <p>
          Faites glisser vers la force ou la faiblesse. {filled > 0 ? `${filled} trait${filled > 1 ? 's' : ''} sur 24 renseigné${filled > 1 ? 's' : ''}.` : 'Aucun trait renseigné.'}
        </p>
        {filled > 0 && (
          <Button size="sm" variant="ghost" onClick={() => onChange(Object.fromEntries(Object.keys(value).map((k) => [k, null])))}>
            Tout effacer
          </Button>
        )}
      </div>

      <div className={styles.groups}>
        {TRAIT_GROUPS.map((group) => (
          <fieldset key={group.key} className={styles.group}>
            <legend className={styles.legend}>{group.label}</legend>
            <div className={styles.traits}>
              {group.traits.map((t) => {
                const v = value[t.key];
                return (
                  <div
                    key={t.key}
                    className={cx(styles.trait, v == null && styles.unset, v < 0 && styles.leanWeak, v > 0 && styles.leanStrong)}
                  >
                    <div className={styles.labels} aria-hidden>
                      <span className={styles.weakness}>{t.weakness}</span>
                      <span className={styles.strength}>{t.strength}</span>
                    </div>
                    <input
                      type="range"
                      min={TRAIT_MIN}
                      max={TRAIT_MAX}
                      step={1}
                      value={v ?? 0}
                      onChange={(e) => set(t.key, Number(e.target.value))}
                      // Un clic sur un curseur non renseigné le fixe à la valeur cliquée
                      onPointerDown={() => v == null && set(t.key, 0)}
                      className={styles.slider}
                      aria-label={`${t.strength} / ${t.weakness}`}
                      aria-valuetext={v == null ? 'Non renseigné' : `${formatValue(v)} (${v >= 0 ? t.strength : t.weakness})`}
                    />
                    <div className={styles.value}>
                      <span className={styles.number}>{formatValue(v)}</span>
                      <button
                        type="button"
                        className={styles.clear}
                        onClick={() => set(t.key, null)}
                        disabled={v == null}
                        aria-label={`Effacer ${t.strength}`}
                      >
                        <X aria-hidden />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>
    </>
  );
}
