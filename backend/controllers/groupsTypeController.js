const GroupType = require('../models/GroupType');
const { referenceController } = require('../utils/referenceController');

// Référentiel « Type de groupe » : liste ordonnée, création, modification, suppression, réordonnancement
module.exports = referenceController(GroupType, { label: 'Type de groupe', fields: [] });
