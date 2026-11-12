const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Univers = require('./Univers');
const { jsonGetter } = require('../utils/colors');

const Specie = sequelize.define('Specie', {
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
      model: 'species', // doit correspondre au tableName
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
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
  // Illustration de l'espèce
  image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Fond de la page de l'espèce : image, ou couleur si pas d'image
  background: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  backgroundColor: {
    type: DataTypes.STRING(7),
    allowNull: true,
  },
  // Couleurs propres à l'espèce : { primary, secondary, tertiary } (null = aucune)
  colors: {
    type: DataTypes.JSON,
    allowNull: true,
    get: jsonGetter('colors'),
  },
}, {
  tableName: 'species',
  timestamps: false, // change si tu veux createdAt/updatedAt
});

// Self-referential associations (parent / children)
Specie.belongsTo(Specie, { as: 'parent', foreignKey: 'parentId' });
Specie.hasMany(Specie, { as: 'children', foreignKey: 'parentId' });

Specie.belongsTo(Univers, { as: 'universe', foreignKey: 'universe_id' });
Univers.hasMany(Specie, { as: 'species', foreignKey: 'universe_id' });

module.exports = Specie;
