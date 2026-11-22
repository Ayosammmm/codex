const express = require("express");
const router = express.Router();
const controller = require("../controllers/characterController");
const { uploadAvatar, createUploadMiddleware } = require("../middlewares/upload.js");
const { createAudioUploadMiddleware } = require("../middlewares/upload.js");
const uploadCharacterBackground = createUploadMiddleware("characters/backgrounds", true);
const uploadThemeSound = createAudioUploadMiddleware("characters/sounds");
const forms = require("../controllers/characterFormsController");
// Fichiers des formes : dossiers à part (le nommage par id du personnage pourrait entrer en collision)
const uploadFormAvatar = createUploadMiddleware("characters/forms/avatars");
const uploadFormBackground = createUploadMiddleware("characters/forms/backgrounds");

router.post("/", controller.createCharacter);
router.get("/", controller.getCharacters);
router.get("/:id", controller.getCharacter);
router.put("/:id", controller.updateCharacter);
router.delete("/:id", controller.deleteCharacter);
router.post("/:id/avatar", uploadAvatar.single("avatar"), controller.uploadAvatar);
router.delete("/:id/avatar", controller.deleteAvatar);
router.post("/:id/background", uploadCharacterBackground.single("background"), controller.uploadBackground);
router.delete("/:id/background", controller.deleteBackground);
// Thème musical (module « Son »)
router.post("/:id/themeSound", uploadThemeSound.single("themeSound"), controller.uploadThemeSound);
router.delete("/:id/themeSound", controller.deleteThemeSound);

// Autres formes du personnage (transformations, époques ; « evolve » : faire évoluer)
router.post("/:id/forms", forms.createForm);
router.put("/:id/forms/reorder", forms.reorderForms);
router.post("/:id/forms/evolve", forms.evolve);
router.put("/:id/forms/:formId", forms.updateForm);
router.delete("/:id/forms/:formId", forms.deleteForm);
router.post("/:id/forms/:formId/avatar", uploadFormAvatar.single("avatar"), forms.uploadFile("avatar"));
router.delete("/:id/forms/:formId/avatar", forms.deleteFile("avatar"));
router.post("/:id/forms/:formId/background", uploadFormBackground.single("background"), forms.uploadFile("background"));
router.delete("/:id/forms/:formId/background", forms.deleteFile("background"));
router.post("/:id/forms/:formId/themeSound", uploadThemeSound.single("themeSound"), forms.uploadFile("themeSound"));
router.delete("/:id/forms/:formId/themeSound", forms.deleteFile("themeSound"));

module.exports = router;
