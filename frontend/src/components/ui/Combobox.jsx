import { useId, useMemo, useRef, useState } from 'react';
import { X } from '@/components/ui/icons';
import { cx } from './cx';
import styles from './Combobox.module.scss';

const normalize = (text = '') => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const MAX_RESULTS = 80;

/**
 * Champ de recherche avec suggestions (motif ARIA « combobox »), en sélection simple ou multiple.
 * - options : [{ value, label, description?, image?, color? }]
 * - value   : valeur (simple) ou tableau de valeurs (`multiple`)
 * Clavier : ↑ ↓ pour naviguer, Entrée pour choisir, Échap pour fermer, Retour arrière pour retirer la dernière puce.
 */
export function Combobox({
  options,
  value,
  onChange,
  multiple = false,
  placeholder = 'Rechercher…',
  emptyText = 'Aucun résultat',
  id,
  className,
  ...aria
}) {
  const listId = useId();
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);

  const selected = useMemo(() => {
    const values = multiple ? value || [] : value == null ? [] : [value];
    return values.map((v) => options.find((o) => o.value === v)).filter(Boolean);
  }, [value, options, multiple]);

  const results = useMemo(() => {
    const q = normalize(query.trim());
    const taken = new Set(multiple ? value || [] : []);
    return options
      .filter((o) => !taken.has(o.value) && (!q || normalize(`${o.label} ${o.description || ''}`).includes(q)))
      .slice(0, MAX_RESULTS);
  }, [options, query, value, multiple]);

  const choose = (option) => {
    if (multiple) {
      onChange([...(value || []), option.value]);
      setQuery('');
      setActive(0);
    } else {
      onChange(option.value);
      setQuery('');
      setOpen(false);
    }
  };

  const remove = (v) => onChange(multiple ? (value || []).filter((x) => x !== v) : null);

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
    } else if (e.key === 'Escape') {
      if (open) {
        e.stopPropagation();
        setOpen(false);
      }
    } else if (e.key === 'Backspace' && multiple && !query && selected.length) {
      remove(selected[selected.length - 1].value);
    }
  };

  // Sélection simple : le champ affiche l'option choisie tant qu'on ne tape pas
  const inputValue = !multiple && !open ? selected[0]?.label || '' : query;
  const activeId = open && results[active] ? `${listId}-${active}` : undefined;

  return (
    <div
      className={cx(styles.root, className)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setOpen(false)}
    >
      <div className={styles.control} onClick={() => inputRef.current?.focus()}>
        {multiple &&
          selected.map((o) => (
            <span key={o.value} className={styles.chip}>
              <span className={styles.chipLabel}>{o.label}</span>
              <button type="button" className={styles.chipRemove} aria-label={`Retirer ${o.label}`} onClick={() => remove(o.value)}>
                <X aria-hidden />
              </button>
            </span>
          ))}
        <input
          ref={inputRef}
          id={id}
          {...aria}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeId}
          autoComplete="off"
          className={styles.input}
          value={inputValue}
          placeholder={multiple && selected.length ? '' : placeholder}
          onFocus={() => {
            setOpen(true);
            setActive(0);
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
        />
        {!multiple && selected.length > 0 && (
          <button type="button" className={styles.clear} aria-label="Effacer" onClick={() => remove()}>
            <X aria-hidden />
          </button>
        )}
      </div>

      {open && (
        <ul id={listId} role="listbox" aria-multiselectable={multiple || undefined} className={styles.listbox}>
          {results.length === 0 && <li className={styles.empty}>{emptyText}</li>}
          {results.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              className={cx(styles.option, i === active && styles.active)}
              onMouseDown={(e) => e.preventDefault()} // garde le focus dans le champ
              onMouseEnter={() => setActive(i)}
              onClick={() => choose(o)}
            >
              {o.image !== undefined &&
                (o.image ? <img src={o.image} alt="" className={styles.optionImage} loading="lazy" /> : <span className={styles.optionImage} />)}
              {o.color && <span className={styles.optionDot} style={{ background: o.color }} aria-hidden />}
              <span className={styles.optionText}>
                <span className={styles.optionLabel}>{o.label}</span>
                {o.description && <span className={styles.optionDescription}>{o.description}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
