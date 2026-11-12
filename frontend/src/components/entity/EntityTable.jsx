import { Link, useNavigate } from 'react-router';
import { ArrowDown, ArrowUp, ArrowUpDown } from '@/components/ui/icons';
import { cx } from '@/components/ui/cx';
import { entityColorVars } from '@/theme/universeTheme';
import list from './ListViews.module.scss';

/**
 * Définition d'une colonne :
 *   { key, label, render(item), sortKey?, className?,
 *     required?      — toujours affichée (colonne du nom) ;
 *     defaultHidden? — masquée tant que l'utilisateur ne l'a pas affichée ;
 *     edit?          — modifiable en masse : { field, type: 'ref' | 'enum' | 'text' | 'number',
 *                      criterion? (clé d'un critère de filtre, pour ses options), options?, min?, max? } }
 */

function SortHeader({ label, sortKey, sort, onSort }) {
  const active = sort.key === sortKey;
  const Icon = !active ? ArrowUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown;
  return (
    <th aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      <button type="button" className={cx(list.sortButton, !active && list.sortIdle)} onClick={() => onSort(sortKey)}>
        {label}
        <Icon aria-hidden />
      </button>
    </th>
  );
}

export const dash = <span className={list.muted}>—</span>;

/** Cellule du nom : visuel (avatar, logo, vignette) et lien vers la fiche, cible clavier de la ligne. */
export function NameCell({ to, visual, children }) {
  return (
    <span className={list.nameCell}>
      {visual}
      <Link to={to} className={list.rowName} onClick={(e) => e.stopPropagation()}>
        {children}
      </Link>
    </span>
  );
}

/** Case à cocher avec état intermédiaire (« certaines lignes cochées »). */
function Checkbox({ indeterminate = false, ...props }) {
  return (
    <input
      type="checkbox"
      ref={(el) => {
        if (el) el.indeterminate = indeterminate;
      }}
      className={list.checkbox}
      {...props}
    />
  );
}

/**
 * Tableau d'entités. Toute la ligne est cliquable ; le lien du nom reste la cible clavier.
 * - `table`  : état issu de useTableState (colonnes affichées, sélection) — optionnel ;
 * - `fill`   : occupe la hauteur restante du parent (flex) au lieu d'une hauteur fixe.
 */
export function EntityTable({ items, columns, linkTo, sort, onSort, fill = false, table }) {
  const navigate = useNavigate();
  const shown = table ? columns.filter((c) => table.columns.visible.has(c.key)) : columns;
  // Cases à cocher seulement en mode « sélection multiple »
  const selection = table?.selection.enabled && table.selection.active ? table.selection : null;

  const selectable = selection ? items.filter(selection.canSelect) : [];
  const checkedCount = selection ? selectable.filter(selection.isSelected).length : 0;
  const allChecked = selectable.length > 0 && checkedCount === selectable.length;

  return (
    <div className={cx(list.tableWrap, fill && list.tableFill)}>
      <table className={cx(list.table, selection && list.selectable)}>
        <thead>
          <tr>
            {selection && (
              <th className={list.selectCell}>
                <Checkbox
                  checked={allChecked}
                  indeterminate={checkedCount > 0 && !allChecked}
                  disabled={!selectable.length}
                  onChange={() => selection.setMany(selectable, !allChecked)}
                  aria-label={allChecked ? 'Tout désélectionner' : 'Tout sélectionner'}
                />
              </th>
            )}
            {shown.map((c) =>
              c.sortKey && onSort ? (
                <SortHeader key={c.key} label={c.label} sortKey={c.sortKey} sort={sort} onSort={onSort} />
              ) : (
                <th key={c.key}>{c.label}</th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const checked = selection?.isSelected(item) || false;
            return (
              <tr
                key={item.id}
                onClick={() => navigate(linkTo(item))}
                style={entityColorVars(item.colors)}
                aria-selected={selection ? checked : undefined}
                className={cx(checked && list.selected)}
              >
                {selection && (
                  // Clic dans la cellule : coche sans ouvrir la fiche
                  <td className={list.selectCell} onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={checked}
                      disabled={!selection.canSelect(item)}
                      title={selection.canSelect(item) ? undefined : 'Vous ne pouvez pas modifier cet élément'}
                      onChange={(e) => selection.toggle(item, { shift: e.nativeEvent.shiftKey, rows: items })}
                      aria-label={`Sélectionner ${rowLabel(columns, item)}`}
                    />
                  </td>
                )}
                {shown.map((c) => (
                  <td key={c.key} className={c.className}>
                    {c.render(item)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** Nom lisible d'une ligne (pour les libellés accessibles). */
export const rowLabel = (columns, item) => columns.find((c) => c.required)?.text?.(item) ?? item.name ?? '';
