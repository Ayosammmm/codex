const Gender = require('../models/Gender');
const { referenceController } = require('../utils/referenceController');

// Référentiel « Genre » : liste ordonnée, création, modification, suppression, réordonnancement
module.exports = referenceController(Gender, { label: 'Genre', fields: ['color'] });
