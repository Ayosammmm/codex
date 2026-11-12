import { useId, useMemo, useRef, useState } from 'react';
import { cx } from './cx';
import styles from './Combobox.module.scss';
import own from './Autocomplete.module.scss';

const normalize = (text = '') => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const MAX_RESULTS = 40;

/**
 * Saisie libre avec suggestions (motif ARIA « combobox ») : contrairement à Combobox, la valeur
 * est le texte tapé ; les suggestions ne servent qu'à le compléter.
 * - suggestions : [{ value, label?, group?, color? }] — `group` affiche un intertitre
 * - onPick(suggestion) : appelé quand une suggestion est choisie (après onChange)
 * Clavier : ↑ ↓ pour parcourir, Entrée pour choisir, Échap pour fermer.
 */
export function Autocomplete({ value, onChange, onPick, suggestions, placeholder, className, id, ...aria }) {
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef(null);

  const results = useMemo(() => {
    const q = normalize(value.trim());
    // Valeur déjà identique à une suggestion : on montre toutes les suggestions (pour en changer)
    const exact = suggestions.some((s) => normalize(s.value) === q);
    return suggestions.filter((s) => !q || exact || normalize(`${s.value} ${s.group || ''}`).includes(q)).slice(0, MAX_RESULTS);
  }, [suggestions, value]);

  const choose = (s) => {
    onChange(s.value);
    onPick?.(s);
    setOpen(false);
    setActive(-1);
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      if (open && results[active]) {
        e.preventDefault();
        choose(results[active]);
      }
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation();
      setOpen(false);
    }
  };

  const activeId = open && results[active] ? `${listId}-${active}` : undefined;

  return (
    <div className={cx(styles.root, className)} onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}>
      <div className={styles.control} onClick={() => inputRef.current?.focus()}>
        <input
          ref={inputRef}
          id={id}
          {...aria}
          role="combobox"
          aria-expanded={open && results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          className={styles.input}
          value={value}
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(e) => {
            onChange(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onKeyDown={onKeyDown}
        />
      </div>

      {open && results.length > 0 && (
        <ul id={listId} role="listbox" className={styles.listbox}>
          {results.map((s, i) => (
            <li key={`${s.group || ''}-${s.value}`} className={own.item}>
              {/* Intertitre quand le groupe change */}
              {s.group && s.group !== results[i - 1]?.group && (
                <span className={own.group} style={s.color ? { '--group': s.color } : undefined} aria-hidden>
                  {s.group}
                </span>
              )}
              <span
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                className={cx(styles.option, i === active && styles.active)}
                onMouseDown={(e) => e.preventDefault()} // garde le focus dans le champ
                onMouseEnter={() => setActive(i)}
                onClick={() => choose(s)}
              >
                {s.color && <span className={styles.optionDot} style={{ background: s.color }} aria-hidden />}
                <span className={styles.optionText}>
                  <span className={styles.optionLabel}>{s.label || s.value}</span>
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
