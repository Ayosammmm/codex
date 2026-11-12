const express = require('express');
const router = express.Router();
const controller = require('../controllers/entityPhotosController');
const {
  uploadCharacterPhoto,
  uploadCreaturePhoto,
  uploadPlacePhoto,
  uploadGroupPhoto,
  createUploadMiddleware,
} = require('../middlewares/upload');

const uploadSpeciePhoto = createUploadMiddleware('species/photos', false);

// Middleware pour sélectionner le bon upload selon le type d'entité
const getUploadMiddleware = (req, res, next) => {
  const { entityType } = req.params;
  
  switch (entityType) {
    case 'character':
      return uploadCharacterPhoto.single('photo')(req, res, next);
    case 'creature':
      return uploadCreaturePhoto.single('photo')(req, res, next);
    case 'place':
      return uploadPlacePhoto.single('photo')(req, res, next);
    case 'group':
      return uploadGroupPhoto.single('photo')(req, res, next);
    case 'specie':
      return uploadSpeciePhoto.single('photo')(req, res, next);
    default:
      return res.status(400).json({ error: 'Type d\'entité invalide' });
  }
};

// GET - Récupérer toutes les photos d'une entité
router.get('/:entityType/:entityId', controller.getPhotos);

// POST - Upload une nouvelle photo
router.post('/:entityType/:entityId', getUploadMiddleware, controller.uploadPhoto);

// PUT - Mettre à jour une photo
router.put('/:id', controller.updatePhoto);

// DELETE - Supprimer une photo
router.delete('/:id', controller.deletePhoto);

module.exports = router;
