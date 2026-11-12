import list from './ListViews.module.scss';

/**
 * Sections d'une liste regroupée (par statut, par type...) : `groups` vient de groupItems().
 * `render(items)` affiche les éléments de chaque section dans la vue courante.
 */
export function GroupedSections({ groups, render }) {
  return groups.map((g) => (
    <section key={g.key} className={list.groupSection} aria-label={g.label}>
      <h2 className={list.groupHeading}>
        {g.color && <span className={list.groupDot} style={{ background: g.color }} aria-hidden />}
        {g.label}
        <span className={list.groupCount}>{g.items.length}</span>
      </h2>
      {render(g.items)}
    </section>
  ));
}
