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
const { profileAttributes } = require('./characterProfile');

const Character = sequelize.define("Character", {
  ...profileAttributes(),
  theme: {
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
