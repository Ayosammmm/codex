const PlaceType = require('../models/PlaceType');
const { referenceController } = require('../utils/referenceController');

// Référentiel « Type de lieu » : liste ordonnée, création, modification, suppression, réordonnancement
module.exports = referenceController(PlaceType, { label: 'Type de lieu', fields: [] });
