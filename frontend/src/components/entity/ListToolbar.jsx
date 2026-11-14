import { useState } from 'react';
import { ArrowDownAZ, ArrowUpZA, Filter, GitCommitVertical, LayoutGrid, ListTree, MapIcon, Rows3, Search, Table2, X } from '@/components/ui/icons';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Segmented';
import { Select } from '@/components/ui/Select';
import { cx } from '@/components/ui/cx';
import styles from './ListToolbar.module.scss';

/** Vues proposées, par clé. */
const VIEW_OPTIONS = {
  gallery: { value: 'gallery', label: 'Galerie', icon: LayoutGrid },
  cards: { value: 'cards', label: 'Cartes', icon: Rows3 },
  table: { value: 'table', label: 'Tableau', icon: Table2 },
  tree: { value: 'tree', label: 'Arborescence', icon: ListTree },
  timeline: { value: 'timeline', label: 'Frise chronologique', icon: GitCommitVertical },
  map: { value: 'map', label: 'Carte', icon: MapIcon },
};

/**
 * Barre d'outils d'une liste (useListState) : recherche, tri, filtres, regroupement et choix de la vue.
 * - `criteria` : [{ key, label, options: [{ value, label, color }] }] (critères disponibles dans cet univers)
 * - `sorts`    : [{ key, label }] ; `views` : clés de VIEW_OPTIONS
 */
export function ListToolbar({ state, actions, criteria, activeFilterCount, sorts, views, searchPlaceholder, searchLabel }) {
  const [filtersOpen, setFiltersOpen] = useState(activeFilterCount > 0);
  const DirIcon = state.dir === 'asc' ? ArrowDownAZ : ArrowUpZA;

  const activeFilters = Object.entries(state.filters)
    .map(([key, value]) => {
      const criterion = criteria.find((c) => c.key === key);
      if (!criterion) return null;
      const label = value === 'none' ? 'Non renseigné' : criterion.options.find((o) => String(o.value) === value)?.label;
      return label ? { key, criterion: criterion.label, label } : null;
    })
    .filter(Boolean);

  return (
    <div>
      <div className={styles.toolbar}>
        <div className={styles.search}>
          <Search aria-hidden />
          <Input
            type="search"
            value={state.q}
            onChange={(e) => actions.setQuery(e.target.value)}
            placeholder={searchPlaceholder}
            aria-label={searchLabel}
            className={styles.searchInput}
          />
        </div>

        <div className={styles.sort}>
          <Select
            aria-label="Trier par"
            className={styles.sortSelect}
            options={sorts.map((s) => ({ value: s.key, label: `Tri : ${s.label}` }))}
            value={state.sort}
            onChange={actions.setSort}
          />
          <Button
            iconOnly
            icon={DirIcon}
            aria-label={state.dir === 'asc' ? 'Ordre croissant (inverser)' : 'Ordre décroissant (inverser)'}
            title={state.dir === 'asc' ? 'Ordre croissant' : 'Ordre décroissant'}
            onClick={actions.toggleDir}
          />
        </div>

        {criteria.length > 0 && (
          <Button
            icon={Filter}
            aria-expanded={filtersOpen}
            aria-controls="list-filters"
            onClick={() => setFiltersOpen((o) => !o)}
            className={cx(filtersOpen && styles.toggleActive)}
          >
            Filtres
            {activeFilterCount > 0 && <span className={styles.filterCount}>{activeFilterCount}</span>}
          </Button>
        )}

        <span className={styles.spacer} />
        <Segmented label="Affichage" iconOnly options={views.map((v) => VIEW_OPTIONS[v])} value={state.view} onChange={actions.setView} />
      </div>

      {filtersOpen && (
        <div id="list-filters" className={styles.panel}>
          {criteria.map((c) => (
            <div key={c.key} className={styles.panelField}>
              <label htmlFor={`filter-${c.key}`}>{c.label}</label>
              <Select
                id={`filter-${c.key}`}
                compact
                placeholder="Tous"
                options={[...c.options, { value: 'none', label: 'Non renseigné' }]}
                value={state.filters[c.key] || ''}
                onChange={(v) => actions.setFilter(c.key, v)}
              />
            </div>
          ))}
          <div className={styles.panelField}>
            <label htmlFor="group-by">Regrouper par</label>
            <Select
              id="group-by"
              compact
              placeholder="Aucun regroupement"
              options={criteria.map((c) => ({ value: c.key, label: c.label }))}
              value={state.groupBy}
              onChange={actions.setGroupBy}
            />
          </div>
        </div>
      )}

      {(activeFilters.length > 0 || state.q) && (
        <div className={styles.chips} aria-label="Filtres actifs">
          {state.q && (
            <span className={styles.chip}>
              <span className={styles.chipLabel}>Recherche :</span> {state.q}
              <button type="button" aria-label="Effacer la recherche" onClick={() => actions.setQuery('')}>
                <X aria-hidden />
              </button>
            </span>
          )}
          {activeFilters.map((f) => (
            <span key={f.key} className={styles.chip}>
              <span className={styles.chipLabel}>{f.criterion} :</span> {f.label}
              <button type="button" aria-label={`Retirer le filtre ${f.criterion}`} onClick={() => actions.setFilter(f.key, '')}>
                <X aria-hidden />
              </button>
            </span>
          ))}
          <button type="button" className={styles.clearAll} onClick={actions.clearFilters}>
            Tout effacer
          </button>
        </div>
      )}
    </div>
  );
}
