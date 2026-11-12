const express = require("express");
const router = express.Router();
const speciesController = require("../controllers/speciesController");
const { uploadSpecieImage, createUploadMiddleware } = require("../middlewares/upload");

const uploadSpecieBackground = createUploadMiddleware("species/backgrounds", true);

router.post("/", speciesController.create);
router.get("/", speciesController.getAll);
router.get("/:id", speciesController.getById);
router.put("/:id", speciesController.update);
router.delete("/:id", speciesController.delete);

// Images : illustration, fond
router.post("/:id/image", uploadSpecieImage.single("image"), speciesController.uploadImage);
router.delete("/:id/image", speciesController.deleteImage);
router.post("/:id/background", uploadSpecieBackground.single("background"), speciesController.uploadImageField("background"));
router.delete("/:id/background", speciesController.deleteImageField("background"));

module.exports = router;
