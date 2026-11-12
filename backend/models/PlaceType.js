const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Univers = require('./Univers');

const PlaceType = sequelize.define('PlaceType', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Ordre d'affichage choisi par l'utilisateur
  position: {
    type: DataTypes.INTEGER,
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
  tableName: 'places_type', // ou "placetypes" selon ta convention
  timestamps: false, // désactive createdAt / updatedAt
});

PlaceType.belongsTo(Univers, { as: 'universe', foreignKey: 'universe_id' });
Univers.hasMany(PlaceType, { as: 'place_types', foreignKey: 'universe_id' });

module.exports = PlaceType;
