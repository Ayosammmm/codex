const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Univers = require('./Univers');
const Place = require('./Place');
const Character = require('./Character');
const Episode = require('./Episode');
const User = require('./User');

/*
 * Messages : système commun à tout ce qui se raconte « en messages » (voir services/messages.js) :
 * - le roleplay (module « Roleplay ») : fil d'un lieu (`placeId`), scènes (`sceneId`, voir models/Roleplay.js) ;
 * - le récit d'un épisode (`episodeId`), quel que soit le module Roleplay.
 * Un message est écrit par un compte, au nom de zéro, un ou plusieurs personnages (rp_message_characters).
 * Le texte utilise des balises (*action*, « dialogue », (pensée), ~chuchotement~, ((HRP)), {onomatopée})
 * découpées à l'affichage ; commandes de hasard / de mise en scène : services/rpCommands.js.
 * `offThread` : message absent des fils des lieux (scène hors roleplay, récit d'épisode) ; il ne compte pas
 * dans les déplacements des personnages.
 * Les tables gardent leur nom d'origine (rp_…) : elles existaient avant que les messages ne soient séparés du roleplay.
 * `universe_id` sert à l'export / la duplication / la suppression d'univers.
 */

const universeColumn = {
  type: DataTypes.INTEGER,
  allowNull: true,
  references: { model: 'universes', key: 'id' },
  onUpdate: 'CASCADE',
  onDelete: 'SET NULL',
};

const Message = sequelize.define('RpMessage', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  // Texte à balises ; vide si le message n'est qu'une image
  content: { type: DataTypes.TEXT, allowNull: false },
  // Image jointe (/uploads/<dossier>/images/...)
  imagePath: { type: DataTypes.STRING, allowNull: true },
  // Son joint (/uploads/<dossier>/sounds/...)
  soundPath: { type: DataTypes.STRING, allowNull: true },
  // Résultat d'une commande de hasard (/d20, /pileface...) tiré par le serveur : voir services/rpCommands.js
  roll: {
    type: DataTypes.JSON,
    allowNull: true,
    get() {
      const value = this.getDataValue('roll');
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return null; }
      }
      return value;
    },
  },
  // Personnages inconnus (« /??? ») au nom desquels le message est écrit, avec leur place parmi les personnages :
  // [{ slot: 1 | 2 | …, position }] (null : aucun). Dans l'API, ils apparaissent dans `characterIds` avec un id
  // négatif (-slot) : voir services/messages.js.
  unknownSpeakers: {
    type: DataTypes.JSON,
    allowNull: true,
    get() {
      const value = this.getDataValue('unknownSpeakers');
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return null; }
      }
      return value;
    },
  },
  // Mise en scène (/fond, /ambiance...) : 'background', 'background:none', 'background:reset',
  // 'ambience', 'ambience:none', 'ambience:reset' (voir services/rpCommands.js). L'image / le son du message
  // sont alors le nouveau fond / la nouvelle ambiance.
  effect: { type: DataTypes.STRING(32), allowNull: true },
  // Message entièrement hors roleplay (((…)) uniquement) : masqué par le filtre « HRP »
  isHrp: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  // Lieu (roleplay) : null pour le récit d'un épisode
  placeId: { type: DataTypes.INTEGER, allowNull: true },
  // Scène de roleplay (models/Roleplay.js)
  sceneId: { type: DataTypes.INTEGER, allowNull: true },
  // Récit d'un épisode
  episodeId: { type: DataTypes.INTEGER, allowNull: true },
  // Ordre de lecture, quand un message est inséré entre deux autres (récit d'épisode) ; null : ordre d'écriture (id).
  // Les messages se lisent par COALESCE(sortKey, id) croissant : voir services/messages.js (insertionKeys).
  sortKey: { type: DataTypes.DOUBLE, allowNull: true },
  // Absent du fil du lieu (scène hors roleplay, récit d'épisode)
  offThread: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  userId: { type: DataTypes.INTEGER, allowNull: true },
  universe_id: universeColumn,
}, {
  tableName: 'rp_messages',
  engine: 'InnoDB',
  indexes: [{ fields: ['placeId', 'id'] }, { fields: ['episodeId', 'id'] }],
});

// Personnages au nom desquels un message est écrit (`position` : ordre d'affichage)
const MessageCharacter = sequelize.define('RpMessageCharacter', {
  messageId: { type: DataTypes.INTEGER, primaryKey: true },
  characterId: { type: DataTypes.INTEGER, primaryKey: true },
  position: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: 'rp_message_characters',
  engine: 'InnoDB',
  timestamps: false,
  // Messages d'un personnage dans l'ordre : déplacements d'un lieu à l'autre (arrivées / départs)
  indexes: [{ fields: ['characterId', 'messageId'] }],
});

const cascade = { onDelete: 'CASCADE', onUpdate: 'CASCADE' };
const setNull = { onDelete: 'SET NULL', onUpdate: 'CASCADE' };

// Suppression d'un lieu = son fil ; d'un épisode = son récit
Place.hasMany(Message, { foreignKey: 'placeId', ...cascade });
Message.belongsTo(Place, { foreignKey: 'placeId', ...cascade });
Episode.hasMany(Message, { foreignKey: 'episodeId', ...cascade });
Message.belongsTo(Episode, { foreignKey: 'episodeId', ...cascade });

// Suppression d'un compte : ses messages restent (auteur inconnu)
User.hasMany(Message, { foreignKey: 'userId', ...setNull });
Message.belongsTo(User, { as: 'author', foreignKey: 'userId', ...setNull });

Univers.hasMany(Message, { foreignKey: 'universe_id' });

// Suppression d'un message / personnage = les liens concernés
Message.hasMany(MessageCharacter, { as: 'speakers', foreignKey: 'messageId', ...cascade });
MessageCharacter.belongsTo(Message, { foreignKey: 'messageId', ...cascade });
Character.hasMany(MessageCharacter, { foreignKey: 'characterId', ...cascade });
MessageCharacter.belongsTo(Character, { foreignKey: 'characterId', ...cascade });

/**
 * Mise à niveau des bases créées avant la séparation des messages : `placeId` devient facultatif (récits d'épisodes).
 * `sync({ alter: true })` ne modifie pas toujours une colonne de clé étrangère sous MySQL : on le fait ici,
 * une seule fois (rien à faire si la colonne accepte déjà NULL).
 */
async function upgradeMessagesSchema() {
  const [rows] = await sequelize.query(
    `SELECT IS_NULLABLE FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rp_messages' AND COLUMN_NAME = 'placeId'`,
  );
  if (rows[0]?.IS_NULLABLE === 'NO') {
    await sequelize.query('ALTER TABLE `rp_messages` MODIFY `placeId` INTEGER NULL');
    console.log('rp_messages.placeId : désormais facultatif (récits d’épisodes)');
  }
}

/** Un message ne contenant que des passages ((HRP)) est hors roleplay. */
const isHrpContent = (content = '') => content.replace(/\(\([\s\S]*?\)\)/g, '').trim() === '' && /\(\(/.test(content);

module.exports = { Message, MessageCharacter, isHrpContent, upgradeMessagesSchema };
