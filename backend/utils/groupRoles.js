// Rôles d'un groupe : [{ key, name, commands: [clés des rôles commandés directement] }]
// Les rôles par défaut ont leur nom pour clé : les anciens membres (rôle « Chef », « Membre »...) restent valides.
const DEFAULT_ROLES = [
  { key: "Chef", name: "Chef", commands: ["Membre"] },
  { key: "Membre", name: "Membre", commands: [] },
];
const DEFAULT_MEMBER_ROLE = "Membre";
const MAX_ROLES = 30;
const KEY = /^[\p{L}\p{N}_ -]{1,64}$/u;

/** Rôles effectifs d'un groupe (les groupes créés avant cette fonctionnalité ont les rôles par défaut). */
const groupRoles = (group) => (Array.isArray(group?.roles) && group.roles.length ? group.roles : DEFAULT_ROLES);

/**
 * Nettoie les rôles envoyés : clés valides et uniques, noms non vides, commandements vers des rôles
 * existants (pas soi-même), sans cycle (un lien qui en créerait un est ignoré).
 * Renvoie null si la liste est invalide ou vide.
 */
function cleanRoles(input) {
  if (!Array.isArray(input)) return null;
  const seen = new Set();
  const roles = [];
  for (const r of input.slice(0, MAX_ROLES)) {
    const key = typeof r?.key === "string" ? r.key.trim() : "";
    const name = typeof r?.name === "string" ? r.name.trim().slice(0, 60) : "";
    if (!KEY.test(key) || !name || seen.has(key)) continue;
    seen.add(key);
    roles.push({ key, name, commands: Array.isArray(r.commands) ? r.commands : [] });
  }
  if (!roles.length) return null;

  // Commandements : rôles existants, sans doublon ni cycle
  const accepted = new Map(roles.map((r) => [r.key, []]));
  const reaches = (from, to) => {
    const stack = [from];
    const visited = new Set();
    while (stack.length) {
      const k = stack.pop();
      if (k === to) return true;
      if (visited.has(k)) continue;
      visited.add(k);
      stack.push(...accepted.get(k));
    }
    return false;
  };
  for (const r of roles) {
    for (const sub of r.commands) {
      if (typeof sub !== "string" || sub === r.key || !accepted.has(sub) || accepted.get(r.key).includes(sub)) continue;
      if (reaches(sub, r.key)) continue; // créerait un cycle
      accepted.get(r.key).push(sub);
    }
  }
  return roles.map((r) => ({ ...r, commands: accepted.get(r.key) }));
}

/** Rôle par défaut d'un nouveau membre : « Membre » s'il existe, sinon le dernier rôle. */
const fallbackRole = (roles) => (roles.some((r) => r.key === DEFAULT_MEMBER_ROLE) ? DEFAULT_MEMBER_ROLE : roles[roles.length - 1].key);

module.exports = { DEFAULT_ROLES, DEFAULT_MEMBER_ROLE, groupRoles, cleanRoles, fallbackRole };
