const sequelize = require('../config/database');
const { QueryTypes } = require('sequelize');

async function addRoleToCharacterGroups() {
  try {
    console.log('Connexion à la base de données...');
    await sequelize.authenticate();
    console.log('✓ Connexion réussie');

    // Vérifier si la colonne role existe déjà
    const [results] = await sequelize.query(
      `SELECT COLUMN_NAME 
       FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE() 
       AND TABLE_NAME = 'characters_groups' 
       AND COLUMN_NAME = 'role'`,
      { type: QueryTypes.SELECT }
    );

    if (results && results.length > 0) {
      console.log('✓ La colonne "role" existe déjà dans la table characters_groups');
    } else {
      console.log('\nAjout de la colonne "role" à la table characters_groups...');
      
      // Ajouter la colonne role avec une valeur par défaut
      await sequelize.query(
        `ALTER TABLE characters_groups 
         ADD COLUMN role ENUM('Chef', 'Sous-chef', 'Lieutenant', 'Membre', 'Recrue') 
         NOT NULL DEFAULT 'Membre'`,
        { type: QueryTypes.RAW }
      );
      
      console.log('✓ Colonne "role" ajoutée avec succès');
    }

    console.log('\n✓ Script terminé avec succès !');
    process.exit(0);
  } catch (error) {
    console.error('✗ Erreur:', error);
    process.exit(1);
  }
}

// Exécuter le script
addRoleToCharacterGroups();

