const Alignment = require('../models/Alignment');
const { referenceController } = require('../utils/referenceController');

// Référentiel « Alignement » : liste ordonnée, création, modification, suppression, réordonnancement
module.exports = referenceController(Alignment, { label: 'Alignement', fields: ['color', 'description'] });
