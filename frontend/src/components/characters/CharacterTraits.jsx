import { useId } from 'react';
import { deriveCharacterTraits } from '@/config/characterTraits';
import { cx } from '@/components/ui/cx';
import styles from './CharacterTraits.module.scss';

const formatValue = (v) => (v > 0 ? `+${v}` : `−${-v}`);

/**
 * Traits de caractère déduits des traits de personnalité (voir config/characterTraits.js).
 * `scores` : { trait_x: number | null }. Au survol, au focus ou au toucher : infobulle immédiate
 * avec la description et les traits de personnalité en jeu.
 * `title` : intitulé au-dessus ; `emptyText` : message si aucun trait ne ressort (sans lui, rien n'est affiché).
 */
export function CharacterTraits({ scores, title = 'Traits de caractère', emptyText }) {
  const traits = deriveCharacterTraits(scores);
  if (!traits.length && !emptyText) return null;

  return (
    <div className={styles.block}>
      <p className={styles.title}>{title}</p>
      {traits.length ? <TraitList traits={traits} /> : <p className={styles.empty}>{emptyText}</p>}
    </div>
  );
}

function TraitList({ traits }) {
  const id = useId();
  return (
    <ul className={styles.list} aria-label="Traits de caractère">
      {traits.map((t) => {
        const tipId = `${id}-${t.key}`;
        return (
          // Focusable : l'infobulle s'ouvre aussi au clavier et au toucher (pas de délai, contrairement à `title`)
          <li key={t.key} className={cx(styles.trait, t.absolute && styles.absolute)} tabIndex={0} aria-describedby={tipId}>
            {t.label}
            <span id={tipId} role="tooltip" className={styles.tooltip}>
              <span className={styles.tooltipText}>{t.description}</span>
              <span className={styles.tooltipReasons}>
                {t.reasons.map((r) => `${r.label} ${formatValue(r.value)}`).join(' · ')}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
