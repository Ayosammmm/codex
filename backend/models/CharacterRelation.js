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
  // Nature de la relation : clé de la liste fermée (frontend/src/config/characters.js, RELATION_NATURES),
  // ou ancien libellé libre (« Mentor / Élève »...) pour les relations saisies avant
  relation_type: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  // Natures à deux rôles (Parent / Enfant...) : qui tient le premier rôle — 1 : character1, 2 : character2,
  // null : relation réciproque ou pas encore précisé
  lead: {
    type: DataTypes.TINYINT,
    allowNull: true,
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

