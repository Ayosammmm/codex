const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Univers = require('./Univers');

const Gender = sequelize.define('Gender', {
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
  tableName: 'genders',
  timestamps: false, // désactive createdAt / updatedAt
});

Gender.belongsTo(Univers, { as: 'universe', foreignKey: 'universe_id' });
Univers.hasMany(Gender, { as: 'genders', foreignKey: 'universe_id' });

module.exports = Gender;
