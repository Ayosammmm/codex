const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");
const Gender = require('./Gender');
const Status = require('./Status');
const PowerRank = require('./PowerRank');
const Alignment = require('./Alignment');
const Group = require('./Group');
const Place = require('./Place');
const Specie = require('./Specie');
const Univers = require('./Univers');
const CharacterGroup = require('./CharacterGroup');
const CharacterRelation = require('./CharacterRelation');

const Character = sequelize.define("Character", {
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
  theme: {
    type: DataTypes.STRING,
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

  creator_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  universe_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'universes',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
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
}, {
  tableName: "characters",
  freezeTableName: true
});

Character.belongsTo(Gender, { as: 'genders', foreignKey: 'sexe_id' });
Gender.hasMany(Character, { as: 'characters', foreignKey: 'sexe_id' });

Character.belongsTo(Status, { as: 'statuses', foreignKey: 'statut_id' });
Status.hasMany(Character, { as: 'characters', foreignKey: 'statut_id' });

Character.belongsTo(PowerRank, { as: 'power_ranks', foreignKey: 'rank_id' });
PowerRank.hasMany(Character, { as: 'characters', foreignKey: 'rank_id' });

Character.belongsTo(Alignment, { as: 'alignments', foreignKey: 'alignment_id' });
Alignment.hasMany(Character, { as: 'characters', foreignKey: 'alignment_id' });

//ManyToMany Relations

Character.belongsToMany(Group, {
  through: CharacterGroup,
  as: 'groups',
  foreignKey: 'character_id',
  timestamps: false,
});

Group.belongsToMany(Character, {
  through: CharacterGroup,
  as: 'characters',
  foreignKey: 'group_id',
  timestamps: false,
});


Character.belongsToMany(Place, {
  through: 'characters_places',
  as: 'places',
  foreignKey: 'character_id',
  timestamps: false,
});

Place.belongsToMany(Character, {
  through: 'characters_places',
  as: 'characters',
  foreignKey: 'place_id',
  timestamps: false,
});


Character.belongsToMany(Specie, {
  through: 'characters_species',
  as: 'species',
  foreignKey: 'character_id',
  timestamps: false,
});

Specie.belongsToMany(Character, {
  through: 'characters_species',
  as: 'characters',
  foreignKey: 'specie_id',
  timestamps: false,
});

Character.belongsTo(Univers, { as: 'universe', foreignKey: 'universe_id' });
Univers.hasMany(Character, { as: 'characters', foreignKey: 'universe_id' });

// Relations entre personnages (auto-référence)
Character.belongsToMany(Character, {
  through: CharacterRelation,
  as: 'relatedCharacters',
  foreignKey: 'character1_id',
  otherKey: 'character2_id',
  timestamps: false,
});

Character.belongsToMany(Character, {
  through: CharacterRelation,
  as: 'relatedToCharacters',
  foreignKey: 'character2_id',
  otherKey: 'character1_id',
  timestamps: false,
});

module.exports = Character;
