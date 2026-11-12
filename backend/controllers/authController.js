const User = require("../models/User");
const { checkPassword, editableEntities, hashPassword, passwordProblem, signToken } = require("../services/auth");

/** Utilisateur renvoyé au frontend, avec les entités qu'il peut modifier (éditeurs). */
async function sessionPayload(user) {
  const { id, username, displayName, role } = user;
  return { user: { id, username, displayName, role }, editable: role === "editor" ? await editableEntities(id) : null };
}

// POST /auth/login { username, password } → { token, user, editable }
exports.login = async (req, res) => {
  try {
    const username = typeof req.body.username === "string" ? req.body.username.trim().toLowerCase() : "";
    const user = username ? await User.scope("withPassword").findOne({ where: { username } }) : null;
    // Même message si le compte n'existe pas : on ne révèle pas quels identifiants existent
    if (!user || !(await checkPassword(String(req.body.password || ""), user.passwordHash))) {
      return res.status(401).json({ error: "Identifiant ou mot de passe incorrect." });
    }
    res.json({ token: signToken(user), ...(await sessionPayload(user)) });
  } catch (error) {
    console.error("Erreur connexion:", error);
    res.status(500).json({ error: error.message });
  }
};

// GET /auth/me → { user, editable }
exports.me = async (req, res) => {
  if (!req.user) return res.status(401).json({ error: "Connexion requise." });
  res.json(await sessionPayload(req.user));
};

// PUT /auth/password { currentPassword, newPassword }
exports.changePassword = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Connexion requise." });
    const user = await User.scope("withPassword").findByPk(req.user.id);
    if (!(await checkPassword(String(req.body.currentPassword || ""), user.passwordHash))) {
      return res.status(400).json({ error: "Le mot de passe actuel est incorrect." });
    }
    const problem = passwordProblem(req.body.newPassword);
    if (problem) return res.status(400).json({ error: problem });
    await user.update({ passwordHash: await hashPassword(req.body.newPassword) });
    res.json({ message: "Mot de passe modifié." });
  } catch (error) {
    console.error("Erreur mot de passe:", error);
    res.status(500).json({ error: error.message });
  }
};
