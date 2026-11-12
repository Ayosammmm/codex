const User = require("../models/User");
const { hashPassword, passwordProblem } = require("./auth");

/**
 * Premier démarrage : si aucun compte n'existe, crée un super admin à partir du `.env`
 * (ADMIN_USERNAME, ADMIN_PASSWORD, ADMIN_DISPLAY_NAME facultatif).
 * Ne fait rien dès qu'un compte existe : le `.env` ne modifie jamais un compte existant.
 */
async function bootstrapAdmin() {
  if ((await User.count()) > 0) return;

  const username = (process.env.ADMIN_USERNAME || "").trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD || "";
  if (!username || !password) {
    console.warn(
      "Aucun compte n'existe. Pour créer le premier super admin, renseignez ADMIN_USERNAME et ADMIN_PASSWORD " +
        "dans backend/.env puis redémarrez (ou lancez : npm run create-admin -- <identifiant> \"<Nom affiché>\")."
    );
    return;
  }
  const problem = passwordProblem(password);
  if (problem) {
    console.error(`Super admin non créé (ADMIN_PASSWORD) : ${problem}`);
    return;
  }

  const displayName = (process.env.ADMIN_DISPLAY_NAME || "").trim() || "Administrateur";
  await User.create({ username, displayName, role: "superadmin", passwordHash: await hashPassword(password) });
  console.log(`Premier compte créé : « ${username} » (superadmin). Vous pouvez retirer ADMIN_PASSWORD du .env.`);
}

module.exports = bootstrapAdmin;
