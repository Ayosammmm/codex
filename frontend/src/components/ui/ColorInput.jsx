import { useState } from 'react';
import { RotateCcw } from '@/components/ui/icons';
import { isHexColor } from '@/theme/color';
import { Input } from './Field';
import { cx } from './cx';
import styles from './ColorInput.module.scss';

/**
 * Sélecteur de couleur : pastille native + saisie hex.
 * `value` null = couleur par défaut (`fallback`) ; `onReset` affiche un bouton de réinitialisation.
 * Sans `fallback`, le champ peut rester vide (`emptyLabel`, « Aucune » par défaut).
 */
export function ColorInput({ value, fallback, emptyLabel = 'Aucune', onChange, onReset, id, ...aria }) {
  const effective = value || fallback || '';
  const [text, setText] = useState(effective);
  const [synced, setSynced] = useState(effective);

  // La valeur a changé de l'extérieur (pastille, réinitialisation) : on resynchronise la saisie
  if (synced !== effective) {
    setSynced(effective);
    setText(effective);
  }

  const commitText = (raw) => {
    if (raw === '' && onReset) return onReset();
    const hex = raw.startsWith('#') ? raw : `#${raw}`;
    if (isHexColor(hex)) onChange(hex.toLowerCase());
    else setText(effective);
  };

  return (
    <div className={styles.root}>
      <label className={styles.swatch}>
        <span className={cx(styles.swatchColor, !effective && styles.swatchEmpty)} style={effective ? { background: effective } : undefined} aria-hidden />
        <input
          type="color"
          value={effective || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          className={styles.native}
          aria-label="Choisir une couleur"
        />
      </label>
      <Input
        id={id}
        {...aria}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={(e) => commitText(e.target.value.trim())}
        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), commitText(e.currentTarget.value.trim()))}
        spellCheck={false}
        maxLength={7}
        placeholder={fallback ? undefined : emptyLabel}
        className={styles.hex}
      />
      {onReset && value && (
        <button type="button" onClick={onReset} className={styles.reset}>
          <RotateCcw aria-hidden />
          {fallback ? 'Par défaut' : 'Retirer'}
        </button>
      )}
    </div>
  );
}
