const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Character = require('./Character');
const Creature = require('./Creature');
const Place = require('./Place');
const Group = require('./Group');

const EntityPhoto = sequelize.define('EntityPhoto', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  entityType: {
    type: DataTypes.ENUM('character', 'creature', 'place', 'group', 'specie'),
    allowNull: false,
  },
  entityId: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  imagePath: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  caption: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  order: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: 0,
  },
}, {
  tableName: 'entity_photos',
  timestamps: true,
});

// Relations optionnelles (polymorphiques via entityType + entityId)
// On ne peut pas créer de vraies relations Sequelize polymorphiques,
// donc on gère ça manuellement dans les contrôleurs

module.exports = EntityPhoto;
