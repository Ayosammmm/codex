const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Univers = require('./Univers');
const Character = require('./Character');
const Place = require('./Place');
const EpisodeCharacter = require('./EpisodeCharacter');

const Episode = sequelize.define('Episode', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Le récit de l'épisode s'écrit en messages (models/Message.js, `episodeId`)
  // Fond propre à l'épisode (image, ou couleur) ; sans fond, l'épisode prend celui de son histoire
  background: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  backgroundColor: {
    type: DataTypes.STRING(7),
    allowNull: true,
  },
  order: {
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
  tableName: 'episodes',
  timestamps: false,
});

// Relations
Episode.belongsTo(Univers, { as: 'universe', foreignKey: 'universe_id' });
Univers.hasMany(Episode, { as: 'episodes', foreignKey: 'universe_id' });

// Many-to-Many avec Character (avec role: principal/secondaire)
Episode.belongsToMany(Character, {
  through: EpisodeCharacter,
  as: 'characters',
  foreignKey: 'episode_id',
  timestamps: false,
});

Character.belongsToMany(Episode, {
  through: EpisodeCharacter,
  as: 'episodes',
  foreignKey: 'character_id',
  timestamps: false,
});

// Many-to-Many avec Place
Episode.belongsToMany(Place, {
  through: 'episodes_places',
  as: 'places',
  foreignKey: 'episode_id',
  timestamps: false,
});

Place.belongsToMany(Episode, {
  through: 'episodes_places',
  as: 'episodes',
  foreignKey: 'place_id',
  timestamps: false,
});

// Many-to-Many avec Event (défini dans Event.js pour éviter dépendance circulaire)

module.exports = Episode;

