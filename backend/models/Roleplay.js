const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Univers = require('./Univers');
const Place = require('./Place');
const Character = require('./Character');
const Episode = require('./Episode');
const User = require('./User');

/*
 * Roleplay écrit (module « Roleplay », notes Obsidian « Avancement ») :
 * - un fil de messages par lieu (rp_messages) ;
 * - un message est écrit par un compte, au nom de zéro, un ou plusieurs personnages (rp_message_characters) ;
 * - des messages d'un même lieu peuvent être regroupés en scènes (rp_scenes), rattachables à des épisodes.
 * Le texte utilise des balises (*action*, « dialogue », (pensée), ~chuchotement~, ((HRP)), {onomatopée})
 * découpées à l'affichage.
 * `universe_id` est redondant avec le lieu : il sert à l'export / la duplication / la suppression d'univers.
 */

const universeColumn = {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: { model: 'universes', key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'SET NULL',
};

const RpScene = sequelize.define('RpScene', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  title: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  placeId: { type: DataTypes.INTEGER, allowNull: false },
  createdBy: { type: DataTypes.INTEGER, allowNull: true },
  universe_id: universeColumn,
}, {
  tableName: 'rp_scenes',
  engine: 'InnoDB',
});

const RpMessage = sequelize.define('RpMessage', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  // Texte à balises ; vide si le message n'est qu'une image
  content: { type: DataTypes.TEXT, allowNull: false },
  // Image jointe (/uploads/roleplay/images/...)
  imagePath: { type: DataTypes.STRING, allowNull: true },
  // Message entièrement hors roleplay (((…)) uniquement) : masqué par le filtre « HRP »
  isHrp: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  placeId: { type: DataTypes.INTEGER, allowNull: false },
  sceneId: { type: DataTypes.INTEGER, allowNull: true },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  universe_id: universeColumn,
}, {
  tableName: 'rp_messages',
  engine: 'InnoDB',
  indexes: [{ fields: ['placeId', 'id'] }],
});

// Personnages au nom desquels un message est écrit (`position` : ordre d'affichage)
const RpMessageCharacter = sequelize.define('RpMessageCharacter', {
  messageId: { type: DataTypes.INTEGER, primaryKey: true },
  characterId: { type: DataTypes.INTEGER, primaryKey: true },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: 'rp_message_characters',
  engine: 'InnoDB',
  timestamps: false,
});

const RpSceneEpisode = sequelize.define('RpSceneEpisode', {
  sceneId: { type: DataTypes.INTEGER, primaryKey: true },
  episodeId: { type: DataTypes.INTEGER, primaryKey: true },
}, {
  tableName: 'rp_scene_episodes',
  engine: 'InnoDB',
  timestamps: false,
});

// Lecture des fils : dernier message lu par compte et par lieu (bulle « non lu » de la page Roleplay)
const RpRead = sequelize.define('RpRead', {
  userId: { type: DataTypes.INTEGER, primaryKey: true },
  placeId: { type: DataTypes.INTEGER, primaryKey: true },
  lastMessageId: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: 'rp_reads',
  engine: 'InnoDB',
  timestamps: false,
});

const cascade = { onDelete: 'CASCADE', onUpdate: 'CASCADE' };
const setNull = { onDelete: 'SET NULL', onUpdate: 'CASCADE' };

// Suppression d'un lieu = son fil et ses scènes
Place.hasMany(RpScene, { foreignKey: 'placeId', ...cascade });
RpScene.belongsTo(Place, { foreignKey: 'placeId', ...cascade });
Place.hasMany(RpMessage, { foreignKey: 'placeId', ...cascade });
RpMessage.belongsTo(Place, { foreignKey: 'placeId', ...cascade });

// Suppression d'une scène : ses messages restent dans le fil du lieu
RpScene.hasMany(RpMessage, { foreignKey: 'sceneId', ...setNull });
RpMessage.belongsTo(RpScene, { foreignKey: 'sceneId', ...setNull });

// Suppression d'un compte : ses messages restent (auteur inconnu)
User.hasMany(RpMessage, { foreignKey: 'userId', ...setNull });
RpMessage.belongsTo(User, { as: 'author', foreignKey: 'userId', ...setNull });
User.hasMany(RpScene, { foreignKey: 'createdBy', ...setNull });
RpScene.belongsTo(User, { as: 'creator', foreignKey: 'createdBy', ...setNull });

// Suppression d'un compte ou d'un lieu = ses lectures
User.hasMany(RpRead, { foreignKey: 'userId', ...cascade });
RpRead.belongsTo(User, { foreignKey: 'userId', ...cascade });
Place.hasMany(RpRead, { foreignKey: 'placeId', ...cascade });
RpRead.belongsTo(Place, { foreignKey: 'placeId', ...cascade });

Univers.hasMany(RpScene, { foreignKey: 'universe_id' });
Univers.hasMany(RpMessage, { foreignKey: 'universe_id' });

// Suppression d'un message / personnage / scène / épisode = les liens concernés
RpMessage.hasMany(RpMessageCharacter, { as: 'speakers', foreignKey: 'messageId', ...cascade });
RpMessageCharacter.belongsTo(RpMessage, { foreignKey: 'messageId', ...cascade });
Character.hasMany(RpMessageCharacter, { foreignKey: 'characterId', ...cascade });
RpMessageCharacter.belongsTo(Character, { foreignKey: 'characterId', ...cascade });
RpScene.hasMany(RpSceneEpisode, { as: 'episodeLinks', foreignKey: 'sceneId', ...cascade });
RpSceneEpisode.belongsTo(RpScene, { foreignKey: 'sceneId', ...cascade });
Episode.hasMany(RpSceneEpisode, { foreignKey: 'episodeId', ...cascade });
RpSceneEpisode.belongsTo(Episode, { foreignKey: 'episodeId', ...cascade });

/** Un message ne contenant que des passages ((HRP)) est hors roleplay. */
const isHrpContent = (content = '') => content.replace(/\(\([\s\S]*?\)\)/g, '').trim() === '' && /\(\(/.test(content);

module.exports = { RpScene, RpMessage, RpMessageCharacter, RpSceneEpisode, RpRead, isHrpContent };
