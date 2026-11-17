const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Univers = require('./Univers');
const User = require('./User');
const { jsonGetter } = require('../utils/colors');

/**
 * Modding (notes Obsidian « Modding ») :
 * - Mod           : mod installé sur le serveur (manifeste validé ; fichiers dans backend/installed-mods/<id>/)
 * - CustomEntity  : entité d'un type déclaré par un mod (« Artefacts », « Vaisseaux »…), polymorphe `custom`
 * - EntityMetadata: valeurs des champs ajoutés par les mods aux entités de base { [modId]: { champ: valeur } }
 * - ModRecord     : données libres enregistrées par les pages d'un mod (ex. simulations)
 * L'activation d'un mod dans un univers est dans `universes.mods` ({ [modId]: true }).
 */

const Mod = sequelize.define('Mod', {
  id: { type: DataTypes.STRING(40), primaryKey: true },
  name: { type: DataTypes.STRING(80), allowNull: false },
  version: { type: DataTypes.STRING(20), allowNull: false, defaultValue: '1.0.0' },
  manifest: { type: DataTypes.JSON, allowNull: false, get: jsonGetter('manifest') },
  installedBy: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'mods',
  engine: 'InnoDB',
  timestamps: true,
});

const CustomEntity = sequelize.define('CustomEntity', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  modId: { type: DataTypes.STRING(40), allowNull: false },
  typeKey: { type: DataTypes.STRING(40), allowNull: false },
  name: { type: DataTypes.STRING, allowNull: false },
  description: { type: DataTypes.TEXT, allowNull: true },
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'custom_entities', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  universe_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'universes', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  image: { type: DataTypes.STRING, allowNull: true },
  background: { type: DataTypes.STRING, allowNull: true },
  backgroundColor: { type: DataTypes.STRING(7), allowNull: true },
  colors: { type: DataTypes.JSON, allowNull: true, get: jsonGetter('colors') },
  // Valeurs des champs du type : { clé: valeur } (références : [{ type, id }])
  data: { type: DataTypes.JSON, allowNull: true, get: jsonGetter('data') },
}, {
  tableName: 'custom_entities',
  engine: 'InnoDB',
  timestamps: true,
  indexes: [{ fields: ['universe_id', 'modId', 'typeKey'] }],
});

CustomEntity.belongsTo(CustomEntity, { as: 'parent', foreignKey: 'parentId' });
CustomEntity.hasMany(CustomEntity, { as: 'children', foreignKey: 'parentId' });
CustomEntity.belongsTo(Univers, { as: 'universe', foreignKey: 'universe_id' });
Univers.hasMany(CustomEntity, { as: 'customEntities', foreignKey: 'universe_id' });

const EntityMetadata = sequelize.define('EntityMetadata', {
  entityType: { type: DataTypes.STRING(16), primaryKey: true },
  entityId: { type: DataTypes.INTEGER, primaryKey: true },
  universe_id: { type: DataTypes.INTEGER, allowNull: true },
  // { [modId]: { champ: valeur } }
  data: { type: DataTypes.JSON, allowNull: true, get: jsonGetter('data') },
}, {
  tableName: 'entity_metadata',
  engine: 'InnoDB',
  timestamps: false,
  indexes: [{ fields: ['universe_id'] }],
});

const ModRecord = sequelize.define('ModRecord', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  modId: { type: DataTypes.STRING(40), allowNull: false },
  // Regroupement libre choisi par le mod (ex. « simulations »)
  collection: { type: DataTypes.STRING(40), allowNull: false },
  universe_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: { model: 'universes', key: 'id' },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  data: { type: DataTypes.JSON, allowNull: true, get: jsonGetter('data') },
  createdBy: { type: DataTypes.INTEGER, allowNull: true },
}, {
  tableName: 'mod_records',
  engine: 'InnoDB',
  timestamps: true,
  indexes: [{ fields: ['universe_id', 'modId', 'collection'] }],
});

// Auteur d'un enregistrement (sans clé étrangère : un compte supprimé laisse l'enregistrement)
ModRecord.belongsTo(User, { as: 'author', foreignKey: 'createdBy', constraints: false });

module.exports = { Mod, CustomEntity, EntityMetadata, ModRecord };
