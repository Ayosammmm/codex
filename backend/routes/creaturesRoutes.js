const express = require("express");
const router = express.Router();
const creaturesController = require("../controllers/creaturesController");
const { uploadCreatureImage, createUploadMiddleware } = require("../middlewares/upload");

const uploadCreatureBackground = createUploadMiddleware("creatures/backgrounds", true);

router.post("/", creaturesController.create);
router.get("/", creaturesController.getAll);
router.get("/:id", creaturesController.getById);
router.put("/:id", creaturesController.update);
router.delete("/:id", creaturesController.delete);

// Images : illustration, fond
router.post("/:id/image", uploadCreatureImage.single("image"), creaturesController.uploadImage);
router.delete("/:id/image", creaturesController.deleteImage);
router.post("/:id/background", uploadCreatureBackground.single("background"), creaturesController.uploadImageField("background"));
router.delete("/:id/background", creaturesController.deleteImageField("background"));

module.exports = router;
