const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Collection = require('./Collection');

/**
 * Lien entre une entité et une collection (plusieurs collections par entité).
 * Polymorphe comme les éditeurs : entityType = character, place, group, specie, creature, story, event.
 */
const EntityCollection = sequelize.define('EntityCollection', {
  collectionId: { type: DataTypes.INTEGER, primaryKey: true },
  entityType: { type: DataTypes.STRING(16), primaryKey: true },
  entityId: { type: DataTypes.INTEGER, primaryKey: true },
}, {
  tableName: 'entity_collections',
  engine: 'InnoDB',
  timestamps: false,
});

// Suppression d'une collection = ses liens
Collection.hasMany(EntityCollection, { foreignKey: 'collectionId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });
EntityCollection.belongsTo(Collection, { foreignKey: 'collectionId', onDelete: 'CASCADE', onUpdate: 'CASCADE' });

module.exports = EntityCollection;
