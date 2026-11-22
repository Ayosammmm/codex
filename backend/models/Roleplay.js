const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Univers = require('./Univers');
const Place = require('./Place');
const Episode = require('./Episode');
const User = require('./User');
// Messages : système commun (roleplay, récits d'épisodes), voir models/Message.js
const { Message: RpMessage, MessageCharacter: RpMessageCharacter, isHrpContent } = require('./Message');

/*
 * Roleplay écrit (module « Roleplay », notes Obsidian « Avancement ») :
 * - un fil de messages par lieu (messages : voir models/Message.js, système commun avec les récits d'épisodes) ;
 * - des messages d'un même lieu peuvent être regroupés en scènes (rp_scenes), rattachables à des épisodes ;
 * - une scène « hors roleplay » (`standalone` : remake, scène d'avant le RP…) est écrite directement dans la scène :
 *   ses messages (`offThread`) n'apparaissent pas dans le fil du lieu et ne comptent pas dans les déplacements.
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
  // Scène hors roleplay : ses messages sont écrits dans la scène, pas dans le fil du lieu
  standalone: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  createdBy: { type: DataTypes.INTEGER, allowNull: true },
  universe_id: universeColumn,
}, {
  tableName: 'rp_scenes',
  engine: 'InnoDB',
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

// Suppression d'une scène : ses messages restent dans le fil du lieu
RpScene.hasMany(RpMessage, { foreignKey: 'sceneId', ...setNull });
RpMessage.belongsTo(RpScene, { foreignKey: 'sceneId', ...setNull });

// Suppression d'un compte : ses scènes restent
User.hasMany(RpScene, { foreignKey: 'createdBy', ...setNull });
RpScene.belongsTo(User, { as: 'creator', foreignKey: 'createdBy', ...setNull });

// Suppression d'un compte ou d'un lieu = ses lectures
User.hasMany(RpRead, { foreignKey: 'userId', ...cascade });
RpRead.belongsTo(User, { foreignKey: 'userId', ...cascade });
Place.hasMany(RpRead, { foreignKey: 'placeId', ...cascade });
RpRead.belongsTo(Place, { foreignKey: 'placeId', ...cascade });

Univers.hasMany(RpScene, { foreignKey: 'universe_id' });

// Suppression d'une scène / d'un épisode = les liens concernés
RpScene.hasMany(RpSceneEpisode, { as: 'episodeLinks', foreignKey: 'sceneId', ...cascade });
RpSceneEpisode.belongsTo(RpScene, { foreignKey: 'sceneId', ...cascade });
Episode.hasMany(RpSceneEpisode, { foreignKey: 'episodeId', ...cascade });
RpSceneEpisode.belongsTo(Episode, { foreignKey: 'episodeId', ...cascade });

module.exports = { RpScene, RpMessage, RpMessageCharacter, RpSceneEpisode, RpRead, isHrpContent };
