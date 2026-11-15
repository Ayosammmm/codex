const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Univers = require('./Univers');

/**
 * Collection d'un univers (module « Collections ») : regroupement libre d'entités de tous types
 * (une saison, un jeu d'une saga, une ère, « WIP »...). Liens dans entity_collections.
 */
const Collection = sequelize.define('Collection', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  color: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
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
  tableName: 'collections',
  engine: 'InnoDB', // clé étrangère des liens (le moteur par défaut du serveur peut être MyISAM)
  timestamps: false,
});

Collection.belongsTo(Univers, { as: 'universe', foreignKey: 'universe_id' });
Univers.hasMany(Collection, { as: 'collections', foreignKey: 'universe_id' });

module.exports = Collection;
