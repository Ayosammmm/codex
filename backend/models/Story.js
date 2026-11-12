const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Univers = require('./Univers');
const { jsonGetter } = require('../utils/colors');
const Episode = require('./Episode');

const Story = sequelize.define('Story', {
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
  // Début et fin de l'histoire dans la chronologie de l'univers (texte libre : « An 302 », « Printemps »...)
  startDate: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  endDate: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Illustration (couverture)
  image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Fond de la page : image, ou couleur si pas d'image
  background: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  backgroundColor: {
    type: DataTypes.STRING(7),
    allowNull: true,
  },
  // Couleurs propres : { primary, secondary, tertiary } (null = aucune)
  colors: {
    type: DataTypes.JSON,
    allowNull: true,
    get: jsonGetter('colors'),
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
  tableName: 'stories',
  timestamps: false,
});

// Relations
Story.belongsTo(Univers, { as: 'universe', foreignKey: 'universe_id' });
Univers.hasMany(Story, { as: 'stories', foreignKey: 'universe_id' });

// Many-to-Many avec Episode
Story.belongsToMany(Episode, {
  through: 'stories_episodes',
  as: 'episodes',
  foreignKey: 'story_id',
  timestamps: false,
});

Episode.belongsToMany(Story, {
  through: 'stories_episodes',
  as: 'stories',
  foreignKey: 'episode_id',
  timestamps: false,
});

module.exports = Story;

