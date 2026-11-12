import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { characterName } from '@/config/characters';
import { groupRoles, memberCount, memberRole, roleLevels } from '@/config/groups';
import { CharacterChip } from '@/components/characters/CharacterChip';
import { entityColorVars } from '@/theme/universeTheme';
import { plural, universePath } from '@/utils/universe';
import { GroupLogo } from './GroupLogo';
import styles from './GroupOrgChart.module.scss';

/**
 * Hiérarchie affichée : seuls les rôles qui ont des membres. Si un rôle intermédiaire est vide,
 * ses supérieurs sont reliés directement à ses subordonnés (A → [vide] → C devient A → C).
 * Renvoie les étages (rôles par niveau) et les liens entre rôles affichés.
 */
function buildHierarchy(roles, members) {
  const byRole = new Map(roles.map((r) => [r.key, []]));
  for (const m of members) byRole.get(memberRole(m, roles))?.push(m);
  for (const list of byRole.values()) list.sort((a, b) => characterName(a).localeCompare(characterName(b), 'fr'));

  const occupied = roles.filter((r) => byRole.get(r.key).length > 0);
  const occupiedKeys = new Set(occupied.map((r) => r.key));
  const commandsOf = new Map(roles.map((r) => [r.key, r.commands || []]));

  // Liens vers les rôles occupés atteignables en ne traversant que des rôles vides
  const reduced = occupied.map((r) => {
    const targets = new Set();
    const stack = [...commandsOf.get(r.key)];
    const seen = new Set();
    while (stack.length) {
      const k = stack.pop();
      if (seen.has(k)) continue;
      seen.add(k);
      if (occupiedKeys.has(k)) targets.add(k);
      else stack.push(...(commandsOf.get(k) || []));
    }
    return { key: r.key, name: r.name, commands: [...targets], members: byRole.get(r.key) };
  });

  const levels = roleLevels(reduced);
  const tiers = [];
  for (const role of reduced) (tiers[levels.get(role.key)] ||= []).push(role);
  const edges = reduced.flatMap((r) => r.commands.map((to) => ({ from: r.key, to })));
  return { tiers: tiers.filter(Boolean), edges };
}

/** Courbes SVG entre les boîtes de rôles (mesurées après rendu, recalculées au redimensionnement). */
function useConnectors(containerRef, edges) {
  const [paths, setPaths] = useState([]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;
    const measure = () => {
      const origin = container.getBoundingClientRect();
      const box = (key) => container.querySelector(`[data-role="${CSS.escape(key)}"]`)?.getBoundingClientRect();
      setPaths(
        edges
          .map(({ from, to }) => {
            const a = box(from);
            const b = box(to);
            if (!a || !b) return null;
            const x1 = a.left + a.width / 2 - origin.left;
            const y1 = a.bottom - origin.top;
            const x2 = b.left + b.width / 2 - origin.left;
            const y2 = b.top - origin.top;
            const mid = (y2 - y1) / 2;
            return { id: `${from}→${to}`, d: `M ${x1} ${y1} C ${x1} ${y1 + mid}, ${x2} ${y2 - mid}, ${x2} ${y2}` };
          })
          .filter(Boolean),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(container);
    return () => observer.disconnect();
  }, [containerRef, edges]);

  return paths;
}

/**
 * Organigramme d'un groupe : le groupe parent en bulle au sommet, les rôles reliés selon qui
 * commande qui, et les sous-groupes en bulles à la base.
 */
export function GroupOrgChart({ universe, group, subgroups }) {
  const rolesRef = useRef(null);
  const { tiers, edges } = useMemo(() => buildHierarchy(groupRoles(group), group.characters || []), [group]);
  const paths = useConnectors(rolesRef, edges);

  if (!tiers.length && !subgroups.length) {
    return <p className={styles.note}>Aucun membre pour l’instant. Ajoutez-en depuis « Modifier ».</p>;
  }

  return (
    <div className={styles.chart}>
      {group.parent && (
        <div className={styles.tier}>
          <p className={styles.tierLabel}>Fait partie de</p>
          <div className={styles.tierRow}>
            <GroupBubble universe={universe} group={group.parent} />
          </div>
        </div>
      )}

      {tiers.length > 0 && (
        <div className={`${styles.tier} ${styles.tierPlain}`}>
          <div ref={rolesRef} className={styles.hierarchy}>
            <svg className={styles.connectors} aria-hidden>
              {paths.map((p) => (
                <path key={p.id} d={p.d} />
              ))}
            </svg>
            {tiers.map((tier, level) => (
              <ul key={level} className={styles.level}>
                {tier.map((role) => (
                  <li key={role.key} data-role={role.key} className={styles.roleBox}>
                    <p className={styles.tierLabel}>
                      {role.name}
                      <span className={styles.tierCount}>{role.members.length}</span>
                    </p>
                    <ul className={styles.tierRow}>
                      {role.members.map((m) => (
                        <li key={m.id}>
                          <CharacterChip universe={universe} character={m} />
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </div>
      )}

      {subgroups.length > 0 && (
        <div className={styles.tier}>
          <p className={styles.tierLabel}>
            Sous-groupes<span className={styles.tierCount}>{subgroups.length}</span>
          </p>
          <ul className={styles.tierRow}>
            {subgroups.map((sg) => (
              <li key={sg.id}>
                <GroupBubble universe={universe} group={sg} count={memberCount(sg)} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/** Bulle d'un groupe (parent / sous-groupe) dans l'organigramme. */
function GroupBubble({ universe, group, count }) {
  return (
    <Link to={universePath(universe, `groupes/${group.id}`)} className={styles.bubble} style={entityColorVars(group.colors)}>
      <GroupLogo group={group} round className={styles.bubbleLogo} />
      <span className={styles.bubbleText}>
        <span className={styles.bubbleName}>{group.name}</span>
        {count !== undefined && <span className={styles.bubbleCount}>{plural(count, 'membre')}</span>}
      </span>
    </Link>
  );
}
