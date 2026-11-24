const { Sequelize } = require("sequelize");
require("dotenv").config({ path: require("path").join(__dirname, "..", "..", ".env") });

// Connexion à la base : les identifiants viennent du fichier `.env` (voir `.env.example`)
// DB_PASSWORD peut être vide (MySQL local sans mot de passe) mais la ligne doit exister
const required = ["DB_HOST", "DB_NAME", "DB_USER", "JWT_SECRET"];
const missing = required.filter((key) => !process.env[key]);
if (process.env.DB_PASSWORD === undefined) missing.push("DB_PASSWORD");
if (missing.length) {
  throw new Error(`Configuration manquante dans le .env à la racine du projet : ${missing.join(", ")} (voir .env.example)`);
}

const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT) || 3306,
  dialect: "mysql",
});

module.exports = sequelize;
