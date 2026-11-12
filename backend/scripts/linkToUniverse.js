const sequelize = require('../config/database');

// Import de tous les modèles
const Univers = require('../models/Univers');
const Character = require('../models/Character');
const Place = require('../models/Place');
const Group = require('../models/Group');
const Specie = require('../models/Specie');
const Gender = require('../models/Gender');
const Status = require('../models/Status');
const Alignment = require('../models/Alignment');
const PowerRank = require('../models/PowerRank');
const PlaceType = require('../models/PlaceType');
const GroupType = require('../models/GroupType');

async function linkAllEntitiesToUniverse() {
  try {
    console.log('Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✓ Connexion réussie');

    // Créer ou récupérer l'univers avec l'ID 1
    console.log('\nCréation/récupération de l\'univers...');
    let universe = await Univers.findByPk(1);
    
    if (!universe) {
      universe = await Univers.create({
        id: 1,
        name: 'Univers Principal',
        description: 'L\'univers principal contenant toutes les entités existantes',
      });
      console.log('✓ Univers créé avec l\'ID 1');
    } else {
      // Mettre à jour le nom et la description si l'univers existe déjà
      await universe.update({
        name: 'Univers Principal',
        description: 'L\'univers principal contenant toutes les entités existantes',
      });
      console.log('✓ Univers existant mis à jour');
    }

    console.log(`\nUnivers: ${universe.name} (ID: ${universe.id})`);

    // Lister toutes les entités à mettre à jour
    const entities = [
      { model: Character, name: 'Characters' },
      { model: Place, name: 'Places' },
      { model: Group, name: 'Groups' },
      { model: Specie, name: 'Species' },
      { model: Gender, name: 'Genders' },
      { model: Status, name: 'Statuses' },
      { model: Alignment, name: 'Alignments' },
      { model: PowerRank, name: 'PowerRanks' },
      { model: PlaceType, name: 'PlaceTypes' },
      { model: GroupType, name: 'GroupTypes' },
    ];

    console.log('\nMise à jour des entités...');
    
    for (const { model, name } of entities) {
      try {
        // Mettre à jour toutes les entités pour les lier à l'univers 1
        const [updatedCount] = await model.update(
          { universe_id: 1 },
          { 
            where: {} // Pas de condition = toutes les entités
          }
        );
        
        // Compter combien d'entités sont maintenant liées à l'univers
        const totalCount = await model.count({ where: { universe_id: 1 } });
        console.log(`✓ ${name}: ${totalCount} entité(s) liée(s) à l'univers`);
      } catch (error) {
        console.error(`✗ Erreur pour ${name}:`, error.message);
      }
    }

    console.log('\n✓ Script terminé avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('✗ Erreur:', error);
    process.exit(1);
  }
}

// Exécuter le script
linkAllEntitiesToUniverse();

