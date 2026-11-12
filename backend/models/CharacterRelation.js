const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const CharacterRelation = sequelize.define('CharacterRelation', {
  character1_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'characters',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  character2_id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    references: {
      model: 'characters',
      key: 'id',
    },
    onUpdate: 'CASCADE',
    onDelete: 'CASCADE',
  },
  // Nature de la relation, en texte libre (« Mentor / Élève », « Ex »...)
  relation_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Archétype : familiale, amoureuse, amicale, hierarchique, rivalite, inimitie, autre
  category: {
    type: DataTypes.STRING(32),
    allowNull: true,
  },
  // Force du lien, de 1 (faible) à 5 (très forte)
  intensity: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // Ton, de -2 (très négative) à +2 (très positive)
  tone: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  // La relation évolue-t-elle au fil du récit (sinon : figée) ?
  evolving: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
}, {
  tableName: 'character_relations',
  timestamps: false,
});

module.exports = CharacterRelation;

