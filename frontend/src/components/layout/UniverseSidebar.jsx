import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { ArrowLeft, ChevronLeft, ChevronRight, Library, Settings, X } from '@/components/ui/icons';
import { useUniverses } from '@/api/queries';
import { getModulesState, getNavModules, getNavReferences } from '@/config/modules';
import { Button } from '@/components/ui/Button';
import { cx } from '@/components/ui/cx';
import { UniverseAvatar } from '@/components/universe/UniverseAvatar';
import { universeRef } from '@/utils/universe';
import { usePermissions } from '@/auth/auth';
import { COLLECTION_ENTITY_TYPES, useCollectionFilter } from '@/components/collections/collectionFilter';
import { ColorModeToggle } from './ColorModeToggle';
import { UserMenu } from './UserMenu';
import { useUniverseMods } from '@/mods/modsContext';
import styles from './UniverseSidebar.module.scss';

// Sections de modules dans la barre latérale (voir `navSection` dans config/modules.js)
const NAV_SECTIONS = [
  { key: 'encyclopedia', label: 'Encyclopédie' },
  { key: 'games', label: 'Jeux' },
];

/**
 * Navigation d'un univers.
 * - Le logo et le nom mènent à l'accueil de l'univers.
 * - « Encyclopédie » : pages des modules actifs (avec le nombre d'entrées) ; « Jeux » : roleplay…
 * - « Collection » (module Collections) : filtre appliqué aux listes et aux compteurs.
 * - « Référentiels » : listes de valeurs (genres, statuts...), repliables.
 * - En bas : paramètres (qui contiennent aussi le choix clair / sombre).
 * Sur petit écran, elle s'affiche en tiroir (`open` / `onClose`).
 * Sur grand écran, elle peut être réduite à une colonne d'icônes (`collapsed` / `onToggleCollapsed`).
 */
export function UniverseSidebar({ universe, open, onClose, collapsed = false, onToggleCollapsed }) {
  const base = `/univers/${universeRef(universe)}`;
  const { isAdmin } = usePermissions();
  const { pathname } = useLocation();
  const { data: universes } = useUniverses();
  const stats = universes?.find((u) => u.id === universe.id)?.stats || {};
  const collectionFilter = useCollectionFilter();
  const { types: modTypes, pages: modPages, customEntities, customLoading } = useUniverseMods();
  // Nombre de fiches d'un type de mod (filtre de collection compris)
  const modTypeCount = (t) =>
    customLoading ? undefined : customEntities.filter((e) => e.modId === t.modId && e.typeKey === t.key && collectionFilter.matches('custom', e.id)).length;

  const modulesState = getModulesState(universe);
  const modules = getNavModules(modulesState);
  const references = getNavReferences(modulesState);
  const onReference = references.some((r) => pathname.startsWith(`${base}/${r.path}`));
  const [referencesOpen, setReferencesOpen] = useState(onReference);

  // Sur mobile, toute navigation referme le tiroir
  const navProps = { onClick: onClose };
  // Sidebar réduite : libellé en infobulle (le texte reste lu par les lecteurs d'écran)
  const tip = (label) => (collapsed ? label : undefined);

  return (
    <>
      {open && <div className={styles.overlay} onClick={onClose} aria-hidden />}
      <aside id="universe-sidebar" aria-label={`Navigation de ${universe.name}`} className={cx(styles.sidebar, open && styles.open, collapsed && styles.collapsed)}>
        <div className={styles.scroll}>
          <div className={styles.top}>
            <Button variant="ghost" size="sm" iconOnly icon={X} aria-label="Fermer le menu" className={styles.close} onClick={onClose} />
            <Button
              variant="ghost"
              size="sm"
              iconOnly
              icon={collapsed ? ChevronRight : ChevronLeft}
              aria-label={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
              title={collapsed ? 'Déplier le menu' : 'Réduire le menu'}
              aria-expanded={!collapsed}
              className={styles.collapseToggle}
              onClick={onToggleCollapsed}
            />
          </div>

          <NavLink to={base} end className={styles.identity} title="Accueil de l’univers" {...navProps}>
            <UniverseAvatar universe={universe} className={styles.identityAvatar} />
            <span className={styles.identityName}>{universe.name}</span>
          </NavLink>

          {collectionFilter.enabled && (
            <CollectionPicker filter={collectionFilter} onExpand={onToggleCollapsed} />
          )}

          {NAV_SECTIONS.map(({ key, label }) => {
            const items = modules.filter((m) => (m.navSection || 'encyclopedia') === key);
            // Mods actifs : types d'entités et pages de code, après les modules
            const modItems = [...modTypes, ...modPages].filter((m) => m.navSection === key);
            if (!items.length && !modItems.length) return null;
            return (
              <nav key={key} aria-label={label} className={styles.section}>
                <p className={styles.sectionLabel}>{label}</p>
                {items.map((m) => (
                  <NavLink key={m.key} to={`${base}/${m.path}`} className={cx(styles.link, m.parent && styles.child)} title={tip(m.navLabel || m.label)} {...navProps}>
                    <m.icon aria-hidden />
                    <span className={styles.label}>{m.navLabel || m.label}</span>
                    {stats[m.key] !== undefined && (
                      <span className={styles.count}>{collectionFilter.count(COLLECTION_ENTITY_TYPES[m.key], stats[m.key])}</span>
                    )}
                  </NavLink>
                ))}
                {modItems.map((m) => (
                  <NavLink key={m.id} to={`${base}/${m.basePath}`} className={styles.link} title={tip(m.plural || m.label)} {...navProps}>
                    <m.Icon aria-hidden />
                    <span className={styles.label}>{m.plural || m.label}</span>
                    {m.fields && modTypeCount(m) !== undefined && <span className={styles.count}>{modTypeCount(m)}</span>}
                  </NavLink>
                ))}
              </nav>
            );
          })}

          {references.length > 0 && (
            <details
              className={cx(styles.section, styles.collapsible)}
              open={referencesOpen}
              onToggle={(e) => setReferencesOpen(e.currentTarget.open)}
            >
              <summary className={styles.sectionLabel} title={tip(referencesOpen ? 'Masquer les référentiels' : 'Afficher les référentiels')}>
                Référentiels
                <ChevronRight aria-hidden />
              </summary>
              <nav aria-label="Référentiels" className={styles.section}>
                {references.map((r) => (
                  <NavLink key={r.key} to={`${base}/${r.path}`} className={styles.link} title={tip(r.label)} {...navProps}>
                    <r.icon aria-hidden />
                    <span className={styles.label}>{r.label}</span>
                  </NavLink>
                ))}
              </nav>
            </details>
          )}
        </div>

        <div className={styles.bottom}>
          <Link to="/" className={styles.back} aria-label="Tous les univers" title="Tous les univers" {...navProps}>
            <ArrowLeft aria-hidden />
          </Link>
          {/* Paramètres de l'univers : admins ; les autres gardent le choix clair / sombre */}
          {isAdmin ? (
            <NavLink to={`${base}/parametres`} className={styles.link} title={tip('Paramètres')} {...navProps}>
              <Settings aria-hidden />
              <span className={styles.label}>Paramètres</span>
            </NavLink>
          ) : (
            <div className={styles.grow}>
              <ColorModeToggle />
            </div>
          )}
          <UserMenu placement="top" />
        </div>
      </aside>
    </>
  );
}

/**
 * Filtre de collection. Sidebar réduite : simple bouton (marqué si un filtre est actif) qui la déplie.
 */
function CollectionPicker({ filter, onExpand }) {
  const { collections, current } = filter;
  const active = Boolean(filter.filter);
  const label = current ? current.name : filter.filter === 'none' ? 'Sans collection' : 'Toutes';
  const color = current?.color;

  return (
    <div className={cx(styles.collection, active && styles.collectionActive)} style={color ? { '--collection-color': color } : undefined}>
      <button
        type="button"
        className={styles.collectionRail}
        title={`Collection : ${label} (déplier le menu pour changer)`}
        aria-label={`Collection : ${label}. Déplier le menu pour changer`}
        onClick={onExpand}
      >
        <Library aria-hidden />
      </button>
      <label className={styles.collectionField}>
        <span className={styles.sectionLabel}>Collection</span>
        <span className={styles.collectionSelect}>
          <Library aria-hidden />
          <select value={filter.filter} onChange={(e) => filter.setFilter(e.target.value)}>
            <option value="">Toutes les fiches</option>
            {collections.map((c) => (
              <option key={c.id} value={String(c.id)}>{c.name}</option>
            ))}
            <option value="none">Sans collection</option>
          </select>
        </span>
      </label>
    </div>
  );
}
