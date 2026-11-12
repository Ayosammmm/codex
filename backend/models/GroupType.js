const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Univers = require('./Univers');

const GroupType = sequelize.define('GroupType', {
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
  tableName: 'groups_type', // ou "grouptypes" selon ta convention
  timestamps: false, // désactive createdAt / updatedAt
});

GroupType.belongsTo(Univers, { as: 'universe', foreignKey: 'universe_id' });
Univers.hasMany(GroupType, { as: 'group_types', foreignKey: 'universe_id' });

module.exports = GroupType;
