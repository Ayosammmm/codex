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

/**
 * Nom d'origine d'un fichier envoyé, en UTF-8. Multer (busboy) lit le nom du formulaire en latin1 :
 * les caractères non latins (japonais…) arrivent déformés (« ä¸¸ã® » au lieu de « 丸の »). On le relit en UTF-8,
 * sauf s'il n'était pas de l'UTF-8 (caractère invalide).
 */
function originalName(file) {
  const name = Buffer.from(file.originalname, "latin1").toString("utf8");
  return name.includes("\uFFFD") ? file.originalname : name;
}

/**
 * Nom d'enregistrement : horodatage + nom d'origine. Les sons gardent leurs espaces (nom affiché dans l'interface),
 * les autres fichiers les remplacent par « _ ».
 */
const storedName = (file) => {
  const name = originalName(file);
  return Date.now() + "-" + (isAudio(file) ? name.replace(/\s+/g, " ").trim() : name.replace(/\s+/g, "_"));
};

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
        cb(null, storedName(file));
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

// --- Sons (module « Son ») : fichiers audio, 20 Mo max ---
const AUDIO_EXTENSIONS = new Set([".mp3", ".ogg", ".oga", ".wav", ".m4a", ".aac", ".flac", ".opus", ".weba", ".webm"]);
const MAX_AUDIO_SIZE = 20 * 1024 * 1024;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

const isAudio = (file) => file.mimetype.startsWith("audio/") || AUDIO_EXTENSIONS.has(getFileExtension(file.originalname));

/** Stockage dans un sous-dossier d'uploads, nom unique horodaté (le nom d'origine est gardé, sans espaces). */
function diskStorage(subfolder) {
  const dir = path.join(baseUploadDir, subfolder);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, dir),
    filename: (req, file, cb) => cb(null, storedName(file)),
  });
}

/** Middleware d'envoi d'un fichier audio (champ unique) dans un sous-dossier d'uploads. */
function createAudioUploadMiddleware(subfolder) {
  return multer({
    storage: diskStorage(subfolder),
    fileFilter: (req, file, cb) => (isAudio(file) ? cb(null, true) : cb(new Error("Le fichier doit être un son (mp3, ogg, wav…)"))),
    limits: { fileSize: MAX_AUDIO_SIZE },
  });
}

/**
 * Pièces jointes d'un message : `image` (5 Mo, vérifié par le contrôleur) et/ou `sound` (20 Mo),
 * chacune dans son sous-dossier.
 */
function createAttachmentsMiddleware({ imageFolder, soundFolder }) {
  const storages = { image: diskStorage(imageFolder), sound: diskStorage(soundFolder) };
  const storage = {
    _handleFile: (req, file, cb) => storages[file.fieldname]._handleFile(req, file, cb),
    _removeFile: (req, file, cb) => storages[file.fieldname]._removeFile(req, file, cb),
  };
  return multer({
    storage,
    fileFilter: (req, file, cb) => {
      if (file.fieldname === "image" && file.mimetype.startsWith("image/")) return cb(null, true);
      if (file.fieldname === "sound" && isAudio(file)) return cb(null, true);
      cb(new Error(file.fieldname === "sound" ? "Le fichier doit être un son (mp3, ogg, wav…)" : "Le fichier doit être une image"));
    },
    limits: { fileSize: MAX_AUDIO_SIZE },
  }).fields([{ name: "image", maxCount: 1 }, { name: "sound", maxCount: 1 }]);
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
  createAudioUploadMiddleware,
  createAttachmentsMiddleware,
  AUDIO_EXTENSIONS,
  MAX_IMAGE_SIZE,
};
