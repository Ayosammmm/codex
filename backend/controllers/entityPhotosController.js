const EntityPhoto = require('../models/EntityPhoto');
const Character = require('../models/Character');
const Creature = require('../models/Creature');
const Place = require('../models/Place');
const Group = require('../models/Group');
const Specie = require('../models/Specie');
const { CustomEntity } = require('../models/Mod');
const fs = require('fs');
const path = require('path');

// Vérifier que l'entité existe
const validateEntity = async (entityType, entityId) => {
  let entity;
  switch (entityType) {
    case 'character':
      entity = await Character.findByPk(entityId);
      break;
    case 'creature':
      entity = await Creature.findByPk(entityId);
      break;
    case 'place':
      entity = await Place.findByPk(entityId);
      break;
    case 'group':
      entity = await Group.findByPk(entityId);
      break;
    case 'specie':
      entity = await Specie.findByPk(entityId);
      break;
    case 'custom':
      entity = await CustomEntity.findByPk(entityId);
      break;
    default:
      return null;
  }
  return entity;
};

// GET - Récupérer toutes les photos d'une entité
exports.getPhotos = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    // Vérifier que l'entité existe
    const entity = await validateEntity(entityType, entityId);
    if (!entity) {
      return res.status(404).json({ error: 'Entité non trouvée' });
    }

    const photos = await EntityPhoto.findAll({
      where: {
        entityType,
        entityId: parseInt(entityId, 10),
      },
      order: [['order', 'ASC'], ['createdAt', 'ASC']],
    });

    res.json(photos);
  } catch (error) {
    console.error('Erreur récupération photos:', error);
    res.status(500).json({ error: error.message });
  }
};

// POST - Upload une nouvelle photo
exports.uploadPhoto = async (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier envoyé' });
    }

    // Vérifier que l'entité existe
    const entity = await validateEntity(entityType, entityId);
    if (!entity) {
      // Mapper entityType vers le bon nom de dossier pour la suppression
      const folderMap = {
        'character': 'characters',
        'creature': 'creatures',
        'place': 'places',
        'group': 'groups',
        'specie': 'species',
        'custom': 'custom',
      };
      const folderName = folderMap[entityType] || entityType;
      const filePath = path.join(__dirname, '..', 'uploads', folderName, 'photos', req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(404).json({ error: 'Entité non trouvée' });
    }

    // Mapper entityType vers le bon nom de dossier (les dossiers sont au pluriel)
    const folderMap = {
      'character': 'characters',
      'creature': 'creatures',
      'place': 'places',
      'group': 'groups',
      'specie': 'species',
      'custom': 'custom',
    };
    const folderName = folderMap[entityType] || entityType;
    const imagePath = `/uploads/${folderName}/photos/${req.file.filename}`;
    const { caption } = req.body;

    // Récupérer le nombre de photos existantes pour définir l'ordre
    const existingPhotos = await EntityPhoto.count({
      where: {
        entityType,
        entityId: parseInt(entityId, 10),
      },
    });

    const photo = await EntityPhoto.create({
      entityType,
      entityId: parseInt(entityId, 10),
      imagePath,
      caption: caption || null,
      order: existingPhotos,
    });

    res.status(201).json(photo);
  } catch (error) {
    // Échec d'enregistrement : le fichier envoyé ne doit pas rester orphelin
    if (req.file?.path && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    console.error('Erreur upload photo:', error);
    res.status(500).json({ error: error.message });
  }
};

// PUT - Mettre à jour une photo (caption, order)
exports.updatePhoto = async (req, res) => {
  try {
    const { id } = req.params;
    const { caption, order } = req.body;

    const photo = await EntityPhoto.findByPk(id);
    if (!photo) {
      return res.status(404).json({ error: 'Photo non trouvée' });
    }

    const updateData = {};
    // Légende : texte court, vide = pas de légende
    if (caption !== undefined) updateData.caption = typeof caption === 'string' && caption.trim() ? caption.trim().slice(0, 255) : null;
    if (order !== undefined) updateData.order = parseInt(order, 10);

    await photo.update(updateData);

    res.json(photo);
  } catch (error) {
    console.error('Erreur mise à jour photo:', error);
    res.status(500).json({ error: error.message });
  }
};

// DELETE - Supprimer une photo
exports.deletePhoto = async (req, res) => {
  try {
    const { id } = req.params;

    const photo = await EntityPhoto.findByPk(id);
    if (!photo) {
      return res.status(404).json({ error: 'Photo non trouvée' });
    }

    // Supprimer le fichier
    // Le chemin dans photo.imagePath est déjà correct (commence par /uploads/)
    const filePath = path.join(__dirname, '..', photo.imagePath);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    } else {
      console.warn('Fichier non trouvé pour suppression:', filePath);
    }

    await photo.destroy();

    res.json({ success: true, message: 'Photo supprimée avec succès' });
  } catch (error) {
    console.error('Erreur suppression photo:', error);
    res.status(500).json({ error: error.message });
  }
};
