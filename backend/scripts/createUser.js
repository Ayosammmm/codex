/**
 * Création d'un compte en ligne de commande (pour le tout premier super admin, notamment) :
 *   node scripts/createUser.js <identifiant> "<Nom affiché>" [rôle]
 * Le mot de passe est demandé au clavier (ou lu dans la variable CODEX_PASSWORD).
 * Rôles : superadmin (par défaut), admin, editor, reader.
 */
const readline = require("readline");
const sequelize = require("../config/database");
const User = require("../models/User");
require("../models/EntityEditor");
const { ROLES, hashPassword, passwordProblem } = require("../services/auth");

const ask = (question) =>
  new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });

(async () => {
  const [username, displayName, role = "superadmin"] = process.argv.slice(2);
  if (!username || !displayName || !ROLES.includes(role)) {
    console.error('Usage : node scripts/createUser.js <identifiant> "<Nom affiché>" [superadmin|admin|editor|reader]');
    process.exit(1);
  }
  const password = process.env.CODEX_PASSWORD || (await ask("Mot de passe (8 caractères minimum) : "));
  const problem = passwordProblem(password);
  if (problem) {
    console.error(problem);
    process.exit(1);
  }
  await sequelize.sync();
  const login = username.trim().toLowerCase();
  if (await User.findOne({ where: { username: login } })) {
    console.error(`Le compte « ${login} » existe déjà.`);
    process.exit(1);
  }
  await User.create({ username: login, displayName, role, passwordHash: await hashPassword(password) });
  console.log(`Compte « ${login} » (${role}) créé.`);
  await sequelize.close();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
