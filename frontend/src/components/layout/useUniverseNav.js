import { useUniverses } from '@/api/queries';
import { useRoleplayOverview } from '@/api/roleplay';
import { getModulesState, getNavModules } from '@/config/modules';
import { COLLECTION_ENTITY_TYPES, useCollectionFilter } from '@/components/collections/collectionFilter';
import { useUniverseMods } from '@/mods/modsContext';
import { universePath } from '@/utils/universe';

// Sections de navigation d'un univers (voir `navSection` dans config/modules.js et les manifestes de mods)
export const NAV_SECTIONS = [
  { key: 'encyclopedia', label: 'Encyclopédie' },
  { key: 'games', label: 'Jeux' },
];

/**
 * Pages d'un univers, par section (« Encyclopédie », « Jeux »), partagées par la barre latérale
 * et l'accueil : modules actifs, leurs autres pages (ex. Scènes), puis types et pages des mods actifs.
 * Les compteurs tiennent compte du filtre de collection.
 *
 * Retourne [{ key, label, items: [{ key, to, label, icon, count?, child?, subPaths? }] }] (sections vides omises).
 * `subPaths` : autres pages du module, sur lesquelles le lien du module ne doit pas rester actif.
 */
export function useUniverseNav(universe) {
  const { data: universes } = useUniverses();
  const stats = universes?.find((u) => u.id === universe.id)?.stats || {};
  const collectionFilter = useCollectionFilter();
  const { types: modTypes, pages: modPages, customEntities, customLoading } = useUniverseMods();

  const modules = getNavModules(getModulesState(universe));
  const roleplayOn = modules.some((m) => m.key === 'roleplay');
  const { data: roleplay } = useRoleplayOverview(universe.id, { enabled: roleplayOn });
  const extraCounts = { rpScenes: roleplay?.scenes.length };

  // Nombre de fiches d'un type de mod (filtre de collection compris)
  const modTypeCount = (t) =>
    customLoading ? undefined : customEntities.filter((e) => e.modId === t.modId && e.typeKey === t.key && collectionFilter.matches('custom', e.id)).length;

  const to = (path) => universePath(universe, path);
  const extraNav = modules.flatMap((m) => m.extraNav || []);

  return NAV_SECTIONS.map(({ key, label }) => {
    const items = [
      ...modules
        .filter((m) => (m.navSection || 'encyclopedia') === key)
        .map((m) => ({
          key: m.key,
          to: to(m.path),
          label: m.navLabel || m.label,
          icon: m.icon,
          child: Boolean(m.parent),
          subPaths: m.extraNav?.map((e) => to(e.path)),
          count: stats[m.key] !== undefined ? collectionFilter.count(COLLECTION_ENTITY_TYPES[m.key], stats[m.key]) : undefined,
        })),
      ...extraNav
        .filter((e) => (e.navSection || 'encyclopedia') === key)
        .map((e) => ({ key: e.key, to: to(e.path), label: e.label, icon: e.icon, count: extraCounts[e.key] })),
      ...[...modTypes, ...modPages]
        .filter((m) => m.navSection === key)
        .map((m) => ({
          key: m.id,
          to: to(m.basePath),
          label: m.plural || m.label,
          icon: m.Icon,
          count: m.fields ? modTypeCount(m) : undefined,
        })),
    ];
    return { key, label, items };
  }).filter((s) => s.items.length > 0);
}
