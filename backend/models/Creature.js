const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Univers = require('./Univers');
const { jsonGetter } = require('../utils/colors');
const Place = require('./Place');
const PowerRank = require('./PowerRank');

const Creature = sequelize.define('Creature', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Fond de la page de la créature : image, ou couleur si pas d'image
  background: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  backgroundColor: {
    type: DataTypes.STRING(7),
    allowNull: true,
  },
  // Couleurs propres à la créature : { primary, secondary, tertiary } (null = aucune)
  colors: {
    type: DataTypes.JSON,
    allowNull: true,
    get: jsonGetter('colors'),
  },
  powerRankId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'power_ranks',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  // Données biologiques
  averageSize: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  sizeUnit: {
    type: DataTypes.ENUM('cm', 'm'),
    allowNull: true,
    defaultValue: 'cm',
  },
  averageWeight: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  lifeExpectancy: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  activityCycle: {
    type: DataTypes.ENUM('Diurne', 'Nocturne', 'Crépusculaire', 'Variable'),
    allowNull: true,
  },
  diet: {
    type: DataTypes.ENUM('Herbivore', 'Carnivore', 'Omnivore'),
    allowNull: true,
  },
  // Données physiques
  speed: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  physicalStrength: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  endurance: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  robustness: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  naturalResistances: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  naturalWeaknesses: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  // Select et range
  temperament: {
    type: DataTypes.ENUM('Pacifique', 'Défensif', 'Hostile', 'Prédateur'),
    allowNull: true,
  },
  flightBehavior: {
    type: DataTypes.ENUM('Ne fuit pas', 'fuit quand blessé', 'fuit constamment'),
    allowNull: true,
  },
  intelligence: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
  // QuillTextEditor
  attackTypes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  moreDetails: {
    type: DataTypes.TEXT,
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
  tableName: 'creatures',
  timestamps: false,
});

// Associations
Creature.belongsTo(Univers, { as: 'universe', foreignKey: 'universe_id' });
Univers.hasMany(Creature, { as: 'creatures', foreignKey: 'universe_id' });

Creature.belongsTo(PowerRank, { as: 'powerRank', foreignKey: 'powerRankId' });
PowerRank.hasMany(Creature, { as: 'creatures', foreignKey: 'powerRankId' });

// Many-to-Many avec Place (lieux de vie)
Creature.belongsToMany(Place, { 
  through: 'creature_places', 
  as: 'habitats',
  foreignKey: 'creatureId',
  otherKey: 'placeId'
});
Place.belongsToMany(Creature, { 
  through: 'creature_places', 
  as: 'creatures',
  foreignKey: 'placeId',
  otherKey: 'creatureId'
});

module.exports = Creature;

