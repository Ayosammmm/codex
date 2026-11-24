const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * Compte utilisateur (notes Obsidian « Utilisateurs »). Rôles globaux, du plus au moins puissant :
 * superadmin, admin, editor (édite les entités liées à lui), reader (consultation seule).
 */
const User = sequelize.define("User", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  // Unicité via un index nommé (voir `indexes`) : `unique: true` sur la colonne ferait ajouter
  // un nouvel index à chaque `sync({ alter: true })` sous MySQL (username_2, username_3… jusqu'à la limite de 64)
  username: { type: DataTypes.STRING(64), allowNull: false },
  displayName: { type: DataTypes.STRING(120), allowNull: false },
  // Empreinte bcrypt du mot de passe (jamais le mot de passe lui-même)
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM("superadmin", "admin", "editor", "reader"), allowNull: false, defaultValue: "reader" },
}, {
  tableName: "users",
  engine: "InnoDB", // clés étrangères (le moteur par défaut du serveur peut être MyISAM)
  timestamps: true,
  indexes: [{ name: "username", unique: true, fields: ["username"] }],
  // Par défaut, l'empreinte du mot de passe n'est jamais renvoyée
  defaultScope: { attributes: { exclude: ["passwordHash"] } },
  scopes: { withPassword: { attributes: { include: ["passwordHash"] } } },
});

/** Supprime les index en double (username_2, username_3…) laissés par les anciens `sync({ alter: true })`. */
User.dropDuplicateIndexes = async () => {
  const [tables] = await sequelize.query("SHOW TABLES LIKE 'users'");
  if (!tables.length) return;
  const [indexes] = await sequelize.query("SHOW INDEX FROM `users`");
  const duplicates = [...new Set(indexes.map((i) => i.Key_name))].filter((name) => /^username_\d+$/.test(name));
  for (const name of duplicates) await sequelize.query(`ALTER TABLE \`users\` DROP INDEX \`${name}\``);
  if (duplicates.length) console.log(`users : ${duplicates.length} index en double supprimés`);
};

module.exports = User;
