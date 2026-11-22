const { DataTypes } = require("sequelize");

/**
 * Colonnes du « profil » d'un personnage, communes au personnage (sa forme par défaut)
 * et à ses autres formes (models/CharacterForm.js) : identité, classification, récit,
 * personnalité, apparence et médias. Fonction : chaque modèle reçoit ses propres objets.
 */
const profileAttributes = () => ({
  name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  firstname: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  sexe_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'genders', // nom de la table
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  title: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  statut_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'statuses', // nom de la table
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  powers: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  rank_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'power_ranks', // nom de la table
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  alignment_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'alignments', // nom de la table
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  personality: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Module Personnalité : le personnage évolue-t-il au fil du récit ?
  development: {
    type: DataTypes.ENUM('statique', 'dynamique'),
    allowNull: true,
  },
  // Comment il évolue (ou pourquoi il reste le même)
  developmentNote: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Couleurs propres au personnage : { primary, secondary, tertiary } (hex ou null = couleur de l'univers)
  colors: {
    type: DataTypes.JSON,
    allowNull: true,
    get() {
      const value = this.getDataValue('colors');
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return null; }
      }
      return value;
    },
  },
  // Image de fond de la fiche
  background: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Thème musical (module « Son »)
  themeSound: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  story: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  extras: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  avatar: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Traits de personnalité (24 forces VIA avec faiblesses)
  trait_creativite: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_curiosite: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_discernement: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_gout_apprendre: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_perspective: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_bravoure: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_perseverance: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_honnetete: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_enthousiasme: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_amour: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_gentillesse: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_intelligence_sociale: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_esprit_equipe: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_equite: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_leadership: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_pardon: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_modestie: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_prudence: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_autoregulation: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_appreciation_beaute: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_gratitude: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_espoir: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_humour: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  trait_spiritualite: {
    type: DataTypes.INTEGER,
    allowNull: true,
    validate: { min: -10, max: 10 },
  },
  // Nom de la forme (« Forme de base », « Forme démoniaque »…), affiché quand le personnage a plusieurs formes
  formName: {
    type: DataTypes.STRING,
    allowNull: true,
  },
});

// Champs copiés quand on ajoute une forme : tout le profil sauf les images (et le son, copié à part)
const FILE_FIELDS = ["avatar", "background", "themeSound"];
const COPIED_FIELDS = Object.keys(profileAttributes()).filter((key) => !FILE_FIELDS.includes(key) && key !== "formName");

module.exports = { profileAttributes, COPIED_FIELDS, FILE_FIELDS };
