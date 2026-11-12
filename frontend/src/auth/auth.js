import { createContext, useContext } from 'react';

/** Rôles globaux (notes Obsidian « Utilisateurs »), du plus faible au plus fort. */
export const ROLES = [
  { value: 'reader', label: 'Lecteur', description: 'Consulte les univers, sans rien modifier.' },
  { value: 'editor', label: 'Éditeur', description: 'Modifie les entités qui lui sont liées et peut en créer.' },
  { value: 'admin', label: 'Admin', description: 'Gère les univers, toutes les entités et les comptes (sauf super admins).' },
  { value: 'superadmin', label: 'Super admin', description: 'Gère toute l’application, y compris les admins.' },
];
const RANK = Object.fromEntries(ROLES.map((r, i) => [r.value, i]));
export const roleLabel = (role) => ROLES.find((r) => r.value === role)?.label || role;
export const hasRole = (user, role) => Boolean(user) && RANK[user.role] >= RANK[role];

/** Peut-on gérer ce compte / attribuer ce rôle ? (mêmes règles que le backend) */
export const canManageUser = (actor, target) => actor?.role === 'superadmin' || RANK[actor?.role] > RANK[target.role];
export const canGrantRole = (actor, role) => actor?.role === 'superadmin' || RANK[actor?.role] > RANK[role];

/** Initiales d'un nom affiché (pastille de compte). */
export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

export const AUTH_KEY = ['auth', 'session'];
export const AuthContext = createContext(null);

/** Session : { user, editable, status ('anonymous' | 'loading' | 'authenticated' | 'error'), login, logout } */
export const useAuth = () => useContext(AuthContext);

/**
 * Droits de l'utilisateur connecté dans l'interface (le backend vérifie de son côté) :
 * - isAdmin : univers, paramètres, référentiels, comptes ;
 * - canCreate : création d'entités (éditeurs et plus) ;
 * - canEdit(type, id) : entité liée à l'éditeur, ou admin. Types : character, place, group, specie, creature, story, event.
 */
export function usePermissions() {
  const { user, editable } = useAuth();
  const isAdmin = hasRole(user, 'admin');
  return {
    user,
    isAdmin,
    canCreate: hasRole(user, 'editor'),
    canEdit: (type, id) => isAdmin || Boolean(editable?.[type]?.includes(Number(id))),
  };
}
