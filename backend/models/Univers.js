const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Univers = sequelize.define('Univers', {
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
  personalityModuleEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  bestiaryEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  storiesEnabled: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  // Images (chemins /uploads/...)
  logo: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  banner: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  background: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  // Couleur de fond utilisée quand il n'y a pas d'image de fond
  backgroundColor: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  // Couleur du voile posé sur le fond (image ou couleur). Vide = couleur de fond du thème
  scrimColor: {
    type: DataTypes.STRING(16),
    allowNull: true,
  },
  // Thème visuel (voir frontend-v3/src/theme/themes.js)
  theme: {
    type: DataTypes.STRING(32),
    allowNull: false,
    defaultValue: 'almanach',
  },
  // Couleurs personnalisées : { primary, secondary, tertiary } (hex). Clé absente = couleur du thème
  colors: {
    type: DataTypes.JSON,
    allowNull: true,
    get() {
      const value = this.getDataValue('colors');
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return null; }
      }
      return value;
    },
  },
  // Modules activés/désactivés : { characters: true, places: false, ... }
  // Une clé absente = valeur par défaut du module (voir frontend-v2/src/config/modules.js)
  modules: {
    type: DataTypes.JSON,
    allowNull: true,
    get() {
      const value = this.getDataValue('modules');
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return null; }
      }
      return value;
    },
  },
}, {
  tableName: 'universes',
  timestamps: false,
});

module.exports = Univers;

