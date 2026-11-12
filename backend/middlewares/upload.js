const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Chemin de base vers le dossier uploads
const baseUploadDir = path.join(__dirname, "..", "uploads");

// Fonction pour formater la date au format YYYY-MM-DD-HH-MM-SS
function formatDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day}-${hours}-${minutes}-${seconds}`;
}

// Fonction pour obtenir l'extension d'un fichier
function getFileExtension(filename) {
  return path.extname(filename).toLowerCase();
}

// Fonction pour créer un middleware multer avec un sous-dossier spécifique
function createUploadMiddleware(subfolder = "", useIdNaming = false) {
  const uploadDir = subfolder 
    ? path.join(baseUploadDir, subfolder)
    : baseUploadDir;

  // Création du dossier s'il n'existe pas
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      if (useIdNaming && req.params.id) {
        // Format: [ID]-[date].[extension]
        const id = req.params.id;
        const date = formatDate();
        const extension = getFileExtension(file.originalname) || '.jpg';
        const filename = `${id}-${date}${extension}`;
        cb(null, filename);
      } else {
        // Format par défaut (rétrocompatibilité)
        const safeName = file.originalname.replace(/\s+/g, "_");
        cb(null, Date.now() + "-" + safeName);
      }
    },
  });

  return multer({
    storage,
    fileFilter: function (req, file, cb) {
      if (!file.mimetype.startsWith("image/")) {
        return cb(new Error("Le fichier doit être une image"));
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5 Mo max
    },
  });
}

// Middleware par défaut (pour rétrocompatibilité)
const upload = createUploadMiddleware();

// Middlewares spécifiques avec nommage par ID
const uploadAvatar = createUploadMiddleware("characters/avatars", true);
const uploadBackground = createUploadMiddleware("places/backgrounds", true);
const uploadGroupImage = createUploadMiddleware("groups/images", true);
const uploadSpecieImage = createUploadMiddleware("species/images", true);
const uploadCreatureImage = createUploadMiddleware("creatures/images", true);

// Middlewares pour les albums photo
const uploadCharacterPhoto = createUploadMiddleware("characters/photos", false);
const uploadCreaturePhoto = createUploadMiddleware("creatures/photos", false);
const uploadPlacePhoto = createUploadMiddleware("places/photos", false);
const uploadGroupPhoto = createUploadMiddleware("groups/photos", false);

module.exports = {
  upload,
  uploadAvatar,
  uploadBackground,
  uploadGroupImage,
  uploadSpecieImage,
  uploadCreatureImage,
  uploadCharacterPhoto,
  uploadCreaturePhoto,
  uploadPlacePhoto,
  uploadGroupPhoto,
  createUploadMiddleware, // Export pour usage personnalisé si besoin
};
