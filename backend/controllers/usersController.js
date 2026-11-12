const User = require("../models/User");
const { RANK, ROLES, hasRole, hashPassword, isAdmin, passwordProblem } = require("../services/auth");

/**
 * Gestion des comptes (admins). Les comptes sont créés par un admin, pas d'inscription libre.
 * Un admin ne peut ni créer, ni modifier, ni supprimer un compte d'un rang supérieur ou égal au sien
 * (seul un super admin gère les admins et les autres super admins). Personne ne supprime son propre compte.
 */
const USERNAME = /^[a-z0-9._-]{3,64}$/;
const canManage = (actor, target) => RANK[actor.role] > RANK[target.role] || actor.role === "superadmin";
const canGrant = (actor, role) => RANK[actor.role] > RANK[role] || actor.role === "superadmin";

const requireAdmin = (req, res) => {
  if (isAdmin(req.user)) return true;
  res.status(403).json({ error: "Réservé aux administrateurs." });
  return false;
};

// GET /users — liste complète (admins)
exports.list = async (req, res) => {
  if (!requireAdmin(req, res)) return;
  res.json(await User.findAll({ order: [["displayName", "ASC"]] }));
};

// GET /users/editors — éditeurs (pour lier des entités ; tout utilisateur connecté)
exports.editors = async (req, res) => {
  res.json(await User.findAll({ where: { role: "editor" }, attributes: ["id", "displayName", "username"], order: [["displayName", "ASC"]] }));
};

// POST /users { username, displayName, role, password }
exports.create = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const username = String(req.body.username || "").trim().toLowerCase();
    const displayName = String(req.body.displayName || "").trim().slice(0, 120);
    const role = ROLES.includes(req.body.role) ? req.body.role : "reader";
    if (!USERNAME.test(username)) return res.status(400).json({ error: "Identifiant invalide : 3 à 64 caractères (lettres minuscules, chiffres, . _ -)." });
    if (!displayName) return res.status(400).json({ error: "Le nom affiché est requis." });
    if (!canGrant(req.user, role)) return res.status(403).json({ error: "Vous ne pouvez pas attribuer ce rôle." });
    const problem = passwordProblem(req.body.password);
    if (problem) return res.status(400).json({ error: problem });
    if (await User.findOne({ where: { username } })) return res.status(409).json({ error: "Cet identifiant est déjà utilisé." });
    const user = await User.create({ username, displayName, role, passwordHash: await hashPassword(req.body.password) });
    res.status(201).json(await User.findByPk(user.id));
  } catch (error) {
    console.error("Erreur création compte:", error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /users/:id { displayName?, role?, password? }
exports.update = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "Compte introuvable." });
    const self = user.id === req.user.id;
    if (!self && !canManage(req.user, user)) return res.status(403).json({ error: "Vous ne pouvez pas modifier ce compte." });
    const data = {};
    if (req.body.displayName !== undefined) {
      data.displayName = String(req.body.displayName).trim().slice(0, 120);
      if (!data.displayName) return res.status(400).json({ error: "Le nom affiché est requis." });
    }
    if (req.body.role !== undefined && req.body.role !== user.role) {
      if (self) return res.status(400).json({ error: "Vous ne pouvez pas changer votre propre rôle." });
      if (!ROLES.includes(req.body.role) || !canGrant(req.user, req.body.role)) return res.status(403).json({ error: "Vous ne pouvez pas attribuer ce rôle." });
      data.role = req.body.role;
    }
    if (req.body.password !== undefined) {
      const problem = passwordProblem(req.body.password);
      if (problem) return res.status(400).json({ error: problem });
      data.passwordHash = await hashPassword(req.body.password);
    }
    await user.update(data);
    res.json(await User.findByPk(user.id));
  } catch (error) {
    console.error("Erreur modification compte:", error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE /users/:id
exports.delete = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;
    const user = await User.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "Compte introuvable." });
    if (user.id === req.user.id) return res.status(400).json({ error: "Vous ne pouvez pas supprimer votre propre compte." });
    if (!canManage(req.user, user)) return res.status(403).json({ error: "Vous ne pouvez pas supprimer ce compte." });
    await user.destroy(); // ses liens éditeurs sont supprimés en cascade
    res.json({ message: "Compte supprimé." });
  } catch (error) {
    console.error("Erreur suppression compte:", error);
    res.status(500).json({ error: error.message });
  }
};

