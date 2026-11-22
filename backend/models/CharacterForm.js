const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Character = require("./Character");
const Gender = require("./Gender");
const Status = require("./Status");
const PowerRank = require("./PowerRank");
const Alignment = require("./Alignment");
const Specie = require("./Specie");
const { profileAttributes } = require("./characterProfile");

/**
 * Autre forme d'un personnage : transformation / changement physique, ou version passée (`formType`).
 * La forme par défaut est le personnage lui-même (dans le présent) ; une forme reprend toutes les colonnes de son profil
 * (voir characterProfile.js) et ses propres espèces. Groupes, lieux, relations, album, collections et
 * éditeurs restent ceux du personnage.
 * `universe_id` : permet l'export / la duplication / la suppression de l'univers (services/universeTransfer.js).
 */
const CharacterForm = sequelize.define("CharacterForm", {
  character_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: { model: "characters", key: "id" },
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
  },
  universe_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: "universes", key: "id" },
    onUpdate: "CASCADE",
    onDelete: "SET NULL",
  },
  // « transformation » (transformation, changement physique) ou « temporal » (version passée du personnage)
  formType: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: "transformation",
  },
  // Ordre d'affichage parmi les formes du même type ; époques : ordre chronologique (la plus récente en dernier)
  position: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  ...profileAttributes(),
}, {
  tableName: "character_forms",
  freezeTableName: true,
});

Character.hasMany(CharacterForm, { as: "forms", foreignKey: "character_id", onDelete: "CASCADE" });
CharacterForm.belongsTo(Character, { as: "character", foreignKey: "character_id" });

CharacterForm.belongsTo(Gender, { as: "genders", foreignKey: "sexe_id" });
CharacterForm.belongsTo(Status, { as: "statuses", foreignKey: "statut_id" });
CharacterForm.belongsTo(PowerRank, { as: "power_ranks", foreignKey: "rank_id" });
CharacterForm.belongsTo(Alignment, { as: "alignments", foreignKey: "alignment_id" });

CharacterForm.belongsToMany(Specie, {
  through: "character_forms_species",
  as: "species",
  foreignKey: "form_id",
  otherKey: "specie_id",
  timestamps: false,
});

module.exports = CharacterForm;
