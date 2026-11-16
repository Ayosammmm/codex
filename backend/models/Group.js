const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const GroupType = require('./GroupType');
const Univers = require('./Univers');
const CharacterGroup = require('./CharacterGroup');
const Place = require('./Place');
const GroupPlace = require('./GroupPlace');
const { jsonGetter } = require('../utils/colors');

const Group = sequelize.define('Group', {
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
  parentId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'groups', // doit correspondre au tableName
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
  },
  groupTypeId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'groups_type', // nom de la table GroupType
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'SET NULL',
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
  // Logo du groupe
  image: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  banner: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Fond de la page du groupe : image, ou couleur si pas d'image
  background: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Thème musical (module « Son »)
  themeSound: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  backgroundColor: {
    type: DataTypes.STRING(7),
    allowNull: true,
  },
  // Rôles du groupe et leur hiérarchie : [{ key, name, commands: [clés] }] (null = rôles par défaut)
  roles: {
    type: DataTypes.JSON,
    allowNull: true,
    get: jsonGetter('roles'),
  },
  // Couleurs propres au groupe : { primary, secondary, tertiary } (null = aucune)
  colors: {
    type: DataTypes.JSON,
    allowNull: true,
    get: jsonGetter('colors'),
  },
}, {
  tableName: 'groups',
  timestamps: false, // change si tu veux createdAt/updatedAt
});

// Self-referential associations (parent / children)
Group.belongsTo(Group, { as: 'parent', foreignKey: 'parentId' });
Group.hasMany(Group, { as: 'children', foreignKey: 'parentId' });

Group.belongsTo(GroupType, { as: 'type', foreignKey: 'groupTypeId' });
GroupType.hasMany(Group, { as: 'groups', foreignKey: 'groupTypeId' });

Group.belongsTo(Univers, { as: 'universe', foreignKey: 'universe_id' });
Univers.hasMany(Group, { as: 'groups', foreignKey: 'universe_id' });

// Many-to-many relationship: Group controls Place
// Defined on both sides here to avoid circular dependency issues
Group.belongsToMany(Place, {
  through: GroupPlace,
  as: 'controlledPlaces',
  foreignKey: 'group_id',
  timestamps: false,
});

Place.belongsToMany(Group, {
  through: GroupPlace,
  as: 'controllingGroups',
  foreignKey: 'place_id',
  timestamps: false,
});

module.exports = Group;
