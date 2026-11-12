const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

async function addPersonalityModuleToUniverses() {
  try {
    console.log('Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✓ Connexion réussie');

    // Vérifier si la colonne personalityModuleEnabled existe déjà
    const [results] = await sequelize.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'universes' 
       AND COLUMN_NAME = 'personalityModuleEnabled'`,
      { type: QueryTypes.SELECT }
    );

    if (results && results.length > 0) {
      console.log('✓ La colonne "personalityModuleEnabled" existe déjà dans la table universes');
    } else {
      console.log('\nAjout de la colonne "personalityModuleEnabled" à la table universes...');
      
      // Ajouter la colonne avec une valeur par défaut
      await sequelize.query(
        `ALTER TABLE universes 
         ADD COLUMN personalityModuleEnabled BOOLEAN NOT NULL DEFAULT FALSE`,
        { type: QueryTypes.RAW }
      );
      
      console.log('✓ Colonne "personalityModuleEnabled" ajoutée avec succès');
    }

    console.log('\n✓ Script terminé avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('✗ Erreur:', error);
    process.exit(1);
  }
}

// Exécuter le script
addPersonalityModuleToUniverses();

