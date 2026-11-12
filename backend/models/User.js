const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

/**
 * Compte utilisateur (notes Obsidian « Utilisateurs »). Rôles globaux, du plus au moins puissant :
 * superadmin, admin, editor (édite les entités liées à lui), reader (consultation seule).
 */
const User = sequelize.define("User", {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  username: { type: DataTypes.STRING(64), allowNull: false, unique: true },
  displayName: { type: DataTypes.STRING(120), allowNull: false },
  // Empreinte bcrypt du mot de passe (jamais le mot de passe lui-même)
  passwordHash: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM("superadmin", "admin", "editor", "reader"), allowNull: false, defaultValue: "reader" },
}, {
  tableName: "users",
  engine: "InnoDB", // clés étrangères (le moteur par défaut du serveur peut être MyISAM)
  timestamps: true,
  // Par défaut, l'empreinte du mot de passe n'est jamais renvoyée
  defaultScope: { attributes: { exclude: ["passwordHash"] } },
  scopes: { withPassword: { attributes: { include: ["passwordHash"] } } },
});

module.exports = User;
