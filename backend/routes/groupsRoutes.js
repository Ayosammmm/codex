const express = require("express");
const router = express.Router();
const groupsController = require("../controllers/groupsController");
const { uploadGroupImage, createUploadMiddleware, createAudioUploadMiddleware } = require("../middlewares/upload");

const uploadGroupBanner = createUploadMiddleware("groups/banners", true);
const uploadGroupBackground = createUploadMiddleware("groups/backgrounds", true);

router.post("/", groupsController.create);
router.get("/", groupsController.getAll);
router.get("/:id", groupsController.getById);
router.put("/:id", groupsController.update);
router.delete("/:id", groupsController.delete);

// Images : logo (image), bannière, fond
router.post("/:id/image", uploadGroupImage.single("image"), groupsController.uploadImage);
router.delete("/:id/image", groupsController.deleteImage);
router.post("/:id/banner", uploadGroupBanner.single("banner"), groupsController.uploadImageField("banner"));
router.delete("/:id/banner", groupsController.deleteImageField("banner"));
router.post("/:id/background", uploadGroupBackground.single("background"), groupsController.uploadImageField("background"));
router.delete("/:id/background", groupsController.deleteImageField("background"));

// Thème musical (module « Son »)
const uploadThemeSound = createAudioUploadMiddleware("groups/sounds");
router.post("/:id/themeSound", uploadThemeSound.single("themeSound"), groupsController.uploadThemeSound);
router.delete("/:id/themeSound", groupsController.deleteThemeSound);

module.exports = router;
