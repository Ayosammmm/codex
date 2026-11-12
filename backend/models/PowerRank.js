const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Univers = require('./Univers');

const PowerRank = sequelize.define('PowerRank', {
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
  color: {
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
  tableName: 'power_ranks',
  timestamps: false, // désactive createdAt / updatedAt
});

PowerRank.belongsTo(Univers, { as: 'universe', foreignKey: 'universe_id' });
Univers.hasMany(PowerRank, { as: 'power_ranks', foreignKey: 'universe_id' });

module.exports = PowerRank;
