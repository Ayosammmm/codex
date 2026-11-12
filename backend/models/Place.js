const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const PlaceType = require('./PlaceType');
const Univers = require('./Univers');
const { jsonGetter } = require('../utils/colors');

const Place = sequelize.define('Place', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'places', // doit correspondre au tableName
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  placeTypeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'places_type', // nom de la table PlaceType
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  // Bannière (illustration principale du lieu)
  banner: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Fond de la page du lieu : image, ou couleur si pas d'image
  background: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  backgroundColor: {
    type: DataTypes.STRING(7),
    allowNull: true,
  },
  // Module Carte : image de la carte de ce lieu (ses sous-lieux y sont placés)
  mapImage: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Position du lieu sur la carte de son lieu parent, en % de la largeur / hauteur (0 à 100)
  mapX: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  mapY: {
    type: DataTypes.FLOAT,
    allowNull: true,
  },
  // Couleurs propres au lieu : { primary, secondary, tertiary } (null = aucune)
  colors: {
    type: DataTypes.JSON,
    allowNull: true,
    get: jsonGetter('colors'),
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
  tableName: 'places',
  timestamps: false, // change si tu veux createdAt/updatedAt
});

// Self-referential associations (parent / children)
Place.belongsTo(Place, { as: 'parent', foreignKey: 'parentId' });
Place.hasMany(Place, { as: 'children', foreignKey: 'parentId' });

// ✅ Nouvelle relation : un Place a un Type
Place.belongsTo(PlaceType, { as: 'type', foreignKey: 'placeTypeId' });
// ✅ Un Type a plusieurs Places
PlaceType.hasMany(Place, { as: 'places', foreignKey: 'placeTypeId' });

Place.belongsTo(Univers, { as: 'universe', foreignKey: 'universe_id' });
Univers.hasMany(Place, { as: 'places', foreignKey: 'universe_id' });

// Many-to-many relationship: Group controls Place
// (defined in Group.js to avoid circular dependency)

module.exports = Place;
