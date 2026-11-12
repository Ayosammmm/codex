const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Univers = require('./Univers');
const Episode = require('./Episode');
const { jsonGetter } = require('../utils/colors');
const Character = require('./Character');
const Place = require('./Place');
const Group = require('./Group');

const Event = sequelize.define('Event', {
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
  // Position dans la chronologie de l'univers (1 = le plus ancien)
  order: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Moment de l'événement (texte libre : « An 302 », « La nuit du bal »...)
  date: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Importance pour l'univers ou les personnages
  importance: {
    type: DataTypes.ENUM('Mineure', 'Notable', 'Majeure', 'Capitale'),
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
  tableName: 'events',
  timestamps: false,
});

// Relations
Event.belongsTo(Univers, { as: 'universe', foreignKey: 'universe_id' });
Univers.hasMany(Event, { as: 'events', foreignKey: 'universe_id' });

// Many-to-Many avec Character
Event.belongsToMany(Character, {
  through: 'events_characters',
  as: 'characters',
  foreignKey: 'event_id',
  timestamps: false,
});

Character.belongsToMany(Event, {
  through: 'events_characters',
  as: 'events',
  foreignKey: 'character_id',
  timestamps: false,
});

// Many-to-Many avec Place
Event.belongsToMany(Place, {
  through: 'events_places',
  as: 'places',
  foreignKey: 'event_id',
  timestamps: false,
});

Place.belongsToMany(Event, {
  through: 'events_places',
  as: 'events',
  foreignKey: 'place_id',
  timestamps: false,
});

// Many-to-Many avec Group
Event.belongsToMany(Group, {
  through: 'events_groups',
  as: 'groups',
  foreignKey: 'event_id',
  timestamps: false,
});

Group.belongsToMany(Event, {
  through: 'events_groups',
  as: 'events',
  foreignKey: 'group_id',
  timestamps: false,
});

// Many-to-Many avec Episode (chargé après pour éviter dépendance circulaire)
// Cette relation sera définie après le chargement du module Episode

// Un événement peut apparaître dans plusieurs épisodes (d'histoires différentes)
Episode.belongsToMany(Event, { through: 'episodes_events', as: 'events', foreignKey: 'episode_id', timestamps: false });
Event.belongsToMany(Episode, { through: 'episodes_events', as: 'episodes', foreignKey: 'event_id', timestamps: false });

module.exports = Event;

