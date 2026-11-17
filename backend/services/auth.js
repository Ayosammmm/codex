const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const EntityEditor = require("../models/EntityEditor");

const ROLES = ["superadmin", "admin", "editor", "reader"];
const RANK = { superadmin: 3, admin: 2, editor: 1, reader: 0 };
const ENTITY_TYPES = ["character", "place", "group", "specie", "creature", "story", "event", "custom"];
const TOKEN_TTL = "7d";

const secret = () => {
  if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET manquant dans backend/.env");
  return process.env.JWT_SECRET;
};

const hasRole = (user, role) => Boolean(user) && RANK[user.role] >= RANK[role];
const isAdmin = (user) => hasRole(user, "admin");

const hashPassword = (password) => bcrypt.hash(password, 12);
const checkPassword = (password, hash) => bcrypt.compare(password, hash);

/** Règles des mots de passe : au moins 8 caractères. Renvoie un message d'erreur ou null. */
const passwordProblem = (password) =>
  typeof password !== "string" || password.length < 8 ? "Le mot de passe doit contenir au moins 8 caractères." : null;

const signToken = (user) => jwt.sign({ sub: user.id, role: user.role }, secret(), { expiresIn: TOKEN_TTL });

/** Utilisateur d'un jeton (vérifié en base : un compte supprimé ou changé de rôle est pris en compte). */
async function userFromToken(token) {
  try {
    const payload = jwt.verify(token, secret());
    return await User.findByPk(payload.sub);
  } catch {
    return null;
  }
}

/** Entités modifiables par un éditeur : { character: [ids], place: [ids], ... }. */
async function editableEntities(userId) {
  const links = await EntityEditor.findAll({ where: { userId } });
  const out = Object.fromEntries(ENTITY_TYPES.map((t) => [t, []]));
  for (const l of links) out[l.entityType]?.push(l.entityId);
  return out;
}

/** L'utilisateur peut-il modifier cette entité ? (admins : toujours ; éditeurs : si elle leur est liée) */
async function canEditEntity(user, entityType, entityId) {
  if (isAdmin(user)) return true;
  if (!hasRole(user, "editor") || !entityId) return false;
  return Boolean(await EntityEditor.findOne({ where: { userId: user.id, entityType, entityId } }));
}

module.exports = {
  ROLES,
  RANK,
  ENTITY_TYPES,
  hasRole,
  isAdmin,
  hashPassword,
  checkPassword,
  passwordProblem,
  signToken,
  userFromToken,
  editableEntities,
  canEditEntity,
};
