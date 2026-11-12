const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const EpisodeCharacter = sequelize.define('EpisodeCharacter', {
  episode_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'episodes',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
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
  // Place du personnage dans l'épisode
  role: {
    type: DataTypes.ENUM('principal', 'secondaire', 'spectateur'),
    allowNull: false,
    defaultValue: 'secondaire',
  },
}, {
  tableName: 'episodes_characters',
  timestamps: false,
});

module.exports = EpisodeCharacter;

