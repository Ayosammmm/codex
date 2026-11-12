import { useMemo, useRef, useState } from 'react';
import { usePermissions } from '@/auth/auth';

const readStored = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key));
    return value && typeof value === 'object' ? value : {};
  } catch {
    return {};
  }
};

/**
 * État de la vue tableau d'une liste d'entités :
 * - colonnes affichées (mémorisées sur l'appareil, par type d'entité) ;
 * - sélection multiple (lignes modifiables par l'utilisateur uniquement), pour les actions groupées.
 *
 * `columns` : définitions de colonnes (voir EntityTable) ; `items` : lignes affichées (après filtres) ;
 * `entityType` : type pour les droits (character, place, group...).
 */
export function useTableState({ storageKey, columns, items, entityType }) {
  const { canEdit } = usePermissions();

  // --- Colonnes ---------------------------------------------------------------
  // { clé: true|false } : seuls les choix explicites sont stockés, le reste suit `defaultHidden`
  const [overrides, setOverrides] = useState(() => readStored(storageKey));
  const persist = (next) => {
    setOverrides(next);
    try {
      localStorage.setItem(storageKey, JSON.stringify(next));
    } catch {
      /* préférence non mémorisée */
    }
  };
  const isVisible = (column) => column.required || (overrides[column.key] ?? !column.defaultHidden);
  const visible = new Set(columns.filter(isVisible).map((c) => c.key));

  // --- Sélection -----------------------------------------------------------------
  const [active, setActive] = useState(false); // mode « sélection multiple » (cases à cocher affichées)
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const anchor = useRef(null); // dernière ligne cochée (Maj+clic : plage)
  const canSelect = (item) => canEdit(entityType, item.id);

  // Seules les lignes encore affichées comptent (une ligne filtrée sort de la sélection)
  const selected = useMemo(() => items.filter((item) => selectedIds.has(item.id)), [items, selectedIds]);

  const setMany = (rows, on) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const row of rows) if (canSelect(row)) on ? next.add(row.id) : next.delete(row.id);
      return next;
    });

  return {
    entityType,
    columns: {
      isVisible,
      visible,
      toggle: (column) => persist({ ...overrides, [column.key]: !isVisible(column) }),
      reset: () => persist({}),
      isDefault: Object.keys(overrides).length === 0,
    },
    selection: {
      selected,
      canSelect,
      // Personne ne peut rien modifier ici (lecteur) : pas de sélection multiple
      enabled: items.some(canSelect),
      active,
      /** Active / quitte le mode sélection ; le quitter vide la sélection. */
      toggleActive: () => {
        if (active) setSelectedIds(new Set());
        anchor.current = null;
        setActive(!active);
      },
      isSelected: (item) => selectedIds.has(item.id),
      /** `rows` : lignes du tableau concerné, dans l'ordre affiché (pour Maj+clic). */
      toggle: (item, { shift = false, rows = [] } = {}) => {
        const on = !selectedIds.has(item.id);
        const from = rows.findIndex((r) => r.id === anchor.current);
        const to = rows.findIndex((r) => r.id === item.id);
        if (shift && from !== -1 && to !== -1) {
          setMany(rows.slice(Math.min(from, to), Math.max(from, to) + 1), on);
        } else {
          setMany([item], on);
        }
        anchor.current = item.id;
      },
      setMany,
      clear: () => setSelectedIds(new Set()),
    },
  };
}
