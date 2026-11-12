const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const User = require("./User");

/**
 * Lien entre un éditeur et une entité qu'il peut modifier (plusieurs éditeurs par entité).
 * Polymorphe comme les albums photo : entityType = character, place, group, specie, creature, story, event.
 */
const EntityEditor = sequelize.define("EntityEditor", {
  entityType: { type: DataTypes.STRING(16), primaryKey: true },
  entityId: { type: DataTypes.INTEGER, primaryKey: true },
  userId: { type: DataTypes.INTEGER, primaryKey: true },
}, {
  tableName: "entity_editors",
  engine: "InnoDB", // clés étrangères (le moteur par défaut du serveur peut être MyISAM)
  timestamps: false,
});

// Association déclarée : la table des comptes est créée avant celle des liens ; suppression d'un compte = ses liens
User.hasMany(EntityEditor, { foreignKey: "userId", onDelete: "CASCADE", onUpdate: "CASCADE" });
EntityEditor.belongsTo(User, { foreignKey: "userId", onDelete: "CASCADE", onUpdate: "CASCADE" });

module.exports = EntityEditor;
