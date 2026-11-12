const Status = require('../models/Status');
const { referenceController } = require('../utils/referenceController');

// Référentiel « Statut » : liste ordonnée, création, modification, suppression, réordonnancement
module.exports = referenceController(Status, { label: 'Statut', fields: ['color'] });
