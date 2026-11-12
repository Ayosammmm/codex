const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CharacterGroup = sequelize.define('CharacterGroup', {
  character_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'characters',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
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
  // Clé d'un rôle du groupe (voir Group.roles) ; les rôles par défaut ont leur nom pour clé
  role: {
    type: DataTypes.STRING(64),
    allowNull: false,
    defaultValue: 'Membre',
  },
}, {
  tableName: 'characters_groups',
  timestamps: false,
});

module.exports = CharacterGroup;

