const express = require("express");
const router = express.Router();
const placesController = require("../controllers/placesController");
const { uploadBackground, createUploadMiddleware, createAudioUploadMiddleware } = require("../middlewares/upload");

const uploadPlaceBanner = createUploadMiddleware("places/banners", true);
const uploadPlaceMap = createUploadMiddleware("places/maps", true);

router.post("/", placesController.create);
router.get("/", placesController.getAll);
router.get("/:id", placesController.getById);
router.put("/:id", placesController.update);
router.delete("/:id", placesController.delete);

// Images : bannière, fond, carte
router.post("/:id/banner", uploadPlaceBanner.single("banner"), placesController.uploadImageField("banner"));
router.delete("/:id/banner", placesController.deleteImageField("banner"));
router.post("/:id/background", uploadBackground.single("background"), placesController.uploadBackground);
router.post("/:id/mapImage", uploadPlaceMap.single("mapImage"), placesController.uploadImageField("mapImage"));
router.delete("/:id/mapImage", placesController.deleteImageField("mapImage"));
router.delete("/:id/background", placesController.deleteBackground);

// Sons (module « Son ») : thème musical, ambiance du fil de roleplay
const uploadPlaceSound = createAudioUploadMiddleware("places/sounds");
for (const field of ["themeSound", "ambientSound"]) {
  router.post(`/:id/${field}`, uploadPlaceSound.single(field), placesController.uploadSound(field));
  router.delete(`/:id/${field}`, placesController.deleteSound(field));
}

module.exports = router;
