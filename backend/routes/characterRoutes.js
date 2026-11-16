const express = require("express");
const router = express.Router();
const controller = require("../controllers/characterController");
const { uploadAvatar, createUploadMiddleware } = require("../middlewares/upload.js");
const { createAudioUploadMiddleware } = require("../middlewares/upload.js");
const uploadCharacterBackground = createUploadMiddleware("characters/backgrounds", true);
const uploadThemeSound = createAudioUploadMiddleware("characters/sounds");

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

module.exports = router;
