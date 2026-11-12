// --- Rôles d'un groupe : [{ key, name, commands: [clés des rôles commandés directement] }] ---
// Les rôles par défaut ont leur nom pour clé (compatibilité avec les anciens membres).
export const DEFAULT_ROLES = [
  { key: 'Chef', name: 'Chef', commands: ['Sous-chef'] },
  { key: 'Sous-chef', name: 'Sous-chef', commands: ['Lieutenant'] },
  { key: 'Lieutenant', name: 'Lieutenant', commands: ['Membre'] },
  { key: 'Membre', name: 'Membre', commands: ['Recrue'] },
  { key: 'Recrue', name: 'Recrue', commands: [] },
];
export const DEFAULT_MEMBER_ROLE = 'Membre';

/** Rôles effectifs d'un groupe (rôles par défaut pour les groupes qui n'en ont pas). */
export const groupRoles = (group) => (Array.isArray(group?.roles) && group.roles.length ? group.roles : DEFAULT_ROLES);

/** Rôle d'un nouveau membre : « Membre » s'il existe, sinon le dernier rôle. */
export const fallbackRole = (roles) => (roles.some((r) => r.key === DEFAULT_MEMBER_ROLE) ? DEFAULT_MEMBER_ROLE : roles[roles.length - 1]?.key);

/** Clé de rôle d'un membre, ramenée au rôle par défaut si elle n'existe plus dans le groupe. */
export const memberRole = (member, roles = DEFAULT_ROLES) => {
  const key = member?.CharacterGroup?.role;
  return roles.some((r) => r.key === key) ? key : fallbackRole(roles);
};

export const roleName = (roles, key) => roles.find((r) => r.key === key)?.name || key;

/**
 * Niveau hiérarchique de chaque rôle : 0 pour ceux que personne ne commande, puis
 * 1 + le niveau le plus bas de leurs supérieurs. Renvoie Map(clé → niveau).
 */
export function roleLevels(roles) {
  const superiors = new Map(roles.map((r) => [r.key, []]));
  for (const r of roles) for (const sub of r.commands || []) superiors.get(sub)?.push(r.key);
  const levels = new Map();
  const visit = (key, stack = new Set()) => {
    if (levels.has(key)) return levels.get(key);
    if (stack.has(key)) return 0; // cycle (ne devrait pas arriver) : coupé
    stack.add(key);
    const level = Math.max(-1, ...superiors.get(key).map((k) => visit(k, stack))) + 1;
    stack.delete(key);
    levels.set(key, level);
    return level;
  };
  roles.forEach((r) => visit(r.key));
  return levels;
}

/** Rang d'un rôle pour trier les membres (niveau, puis ordre de la liste). */
export function roleRanker(roles) {
  const levels = roleLevels(roles);
  const order = new Map(roles.map((r, i) => [r.key, i]));
  return (key) => (levels.get(key) ?? 99) * 1000 + (order.get(key) ?? 999);
}

/** `true` si `from` commande `to`, directement ou non. */
export function commandsTransitively(roles, from, to) {
  const byKey = new Map(roles.map((r) => [r.key, r]));
  const stack = [...(byKey.get(from)?.commands || [])];
  const seen = new Set();
  while (stack.length) {
    const k = stack.pop();
    if (k === to) return true;
    if (seen.has(k)) continue;
    seen.add(k);
    stack.push(...(byKey.get(k)?.commands || []));
  }
  return false;
}

// --- Tris (clé d'URL → comparaison) ---
const collator = new Intl.Collator('fr', { sensitivity: 'base', numeric: true });
const byText = (get) => (a, b) => collator.compare(get(a) || '￿', get(b) || '￿');
const byNumberDesc = (get) => (a, b) => get(b) - get(a);

export const memberCount = (g) => g.characters?.length || 0;

export const SORTS = [
  { key: 'name', label: 'Nom', compare: byText((g) => g.name) },
  { key: 'members', label: 'Nombre de membres', compare: byNumberDesc(memberCount) },
  { key: 'type', label: 'Type', compare: byText((g) => g.type?.name) },
  { key: 'parent', label: 'Groupe parent', compare: byText((g) => g.parent?.name) },
];

/** Critères de filtre / regroupement (options fournies par useGroupReferences). */
export const CRITERIA = [
  { key: 'type', label: 'Type', resource: 'groupTypes', values: (g) => [g.type?.id ?? g.groupTypeId] },
  { key: 'parent', label: 'Groupe parent', resource: 'groups', values: (g) => [g.parentId], noneLabel: 'Sans groupe parent' },
];

export const searchText = (g) =>
  [g.name, g.type?.name, g.parent?.name, ...(g.characters || []).map((c) => [c.firstname, c.name].filter(Boolean).join(' '))].join(' ');
