const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const GroupPlace = sequelize.define('GroupPlace', {
  group_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'groups',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  place_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'places',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
}, {
  tableName: 'groups_places',
  timestamps: false,
});

module.exports = GroupPlace;

