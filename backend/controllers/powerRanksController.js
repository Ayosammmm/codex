const PowerRank = require('../models/PowerRank');
const { referenceController } = require('../utils/referenceController');

// Référentiel « Rang de puissance » : liste ordonnée, création, modification, suppression, réordonnancement
module.exports = referenceController(PowerRank, { label: 'Rang de puissance', fields: ['color', 'description'] });
