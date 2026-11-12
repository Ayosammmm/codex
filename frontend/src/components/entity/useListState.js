import { useMemo } from 'react';
import { useSearchParams } from 'react-router';

export const normalizeText = (text = '') => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const readStored = (key, allowed, fallback) => {
  try {
    const v = localStorage.getItem(key);
    return allowed.includes(v) ? v : fallback;
  } catch {
    return fallback;
  }
};

/**
 * État d'une liste d'entités (personnages, groupes...), stocké dans l'URL (partageable, conservé au retour) :
 *   ?q=texte&sort=name&dir=asc&view=table&group=type&f_type=3
 * - `sorts`      : [{ key, label, compare }] — le premier sert aussi à départager les égalités
 * - `criteria`   : [{ key, label, values(item) }] — filtres et regroupements disponibles
 * - `searchText` : (item) => texte dans lequel chercher
 * - `views`      : clés des vues ; la vue choisie est mémorisée sur l'appareil (`storageKey`)
 */
export function useListState(items, { sorts, criteria, searchText, views, storageKey }) {
  const [params, setParams] = useSearchParams();

  const state = {
    q: params.get('q') || '',
    sort: sorts.some((s) => s.key === params.get('sort')) ? params.get('sort') : sorts[0].key,
    dir: params.get('dir') === 'desc' ? 'desc' : 'asc',
    view: views.includes(params.get('view')) ? params.get('view') : readStored(storageKey, views, views[0]),
    groupBy: criteria.some((c) => c.key === params.get('group')) ? params.get('group') : '',
    filters: Object.fromEntries(
      criteria.filter((c) => params.get(`f_${c.key}`)).map((c) => [c.key, params.get(`f_${c.key}`)]),
    ),
  };

  const set = (patch) =>
    setParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        for (const [key, value] of Object.entries(patch)) {
          if (value === '' || value == null) next.delete(key);
          else next.set(key, value);
        }
        return next;
      },
      { replace: true },
    );

  const actions = {
    setQuery: (q) => set({ q }),
    setSort: (sort) => set({ sort, dir: 'asc' }),
    toggleDir: () => set({ dir: state.dir === 'asc' ? 'desc' : 'asc' }),
    // Clic sur une colonne : même colonne → inverse l'ordre, sinon tri croissant
    sortBy: (sort) => (sort === state.sort ? set({ dir: state.dir === 'asc' ? 'desc' : 'asc' }) : set({ sort, dir: 'asc' })),
    setView: (view) => {
      try {
        localStorage.setItem(storageKey, view);
      } catch {
        /* préférence non mémorisée */
      }
      set({ view });
    },
    setGroupBy: (group) => set({ group }),
    setFilter: (key, value) => set({ [`f_${key}`]: value }),
    clearFilters: () => set({ q: '', ...Object.fromEntries(criteria.map((c) => [`f_${c.key}`, ''])) }),
  };

  const filtersKey = params.toString();
  const results = useMemo(() => {
    const q = normalizeText(state.q.trim());
    const filters = Object.entries(state.filters).map(([key, value]) => [criteria.find((c) => c.key === key), value]);
    const sorter = sorts.find((s) => s.key === state.sort).compare;
    const tieBreak = sorts[0].compare;
    // À valeur égale (même statut, même type...), ordre du premier tri (nom)
    const compare = (a, b) => (state.dir === 'asc' ? sorter(a, b) : sorter(b, a)) || tieBreak(a, b);

    return items
      .filter((item) => {
        if (q && !normalizeText(searchText(item)).includes(q)) return false;
        return filters.every(([criterion, value]) => {
          const values = criterion.values(item).filter((v) => v != null);
          return value === 'none' ? values.length === 0 : values.map(String).includes(value);
        });
      })
      .sort(compare);
    // `filtersKey` (l'URL) couvre la recherche, le tri et les filtres
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, criteria, filtersKey]);

  return { state, actions, results, activeFilterCount: Object.keys(state.filters).length };
}

/**
 * Répartit les éléments selon un critère, dans l'ordre du référentiel.
 * Un élément à plusieurs valeurs apparaît dans chacune. Les non renseignés vont à la fin.
 */
export function groupItems(items, criterion, options) {
  const buckets = new Map(options.map((o) => [String(o.value), { key: String(o.value), label: o.label, color: o.color, items: [] }]));
  const none = { key: 'none', label: criterion.noneLabel || `${criterion.label} non renseigné`, items: [] };
  for (const item of items) {
    const values = criterion.values(item).filter((v) => v != null);
    if (!values.length) none.items.push(item);
    for (const v of values) buckets.get(String(v))?.items.push(item);
  }
  return [...buckets.values(), none].filter((b) => b.items.length);
}
