const express = require("express");
const router = express.Router();
const controller = require("../controllers/eventsController");
const { createUploadMiddleware } = require("../middlewares/upload");

const uploadImage = createUploadMiddleware("events/images", true);
const uploadBackground = createUploadMiddleware("events/backgrounds", true);

router.post("/", controller.create);
router.get("/", controller.getAll);
router.put("/reorder", controller.reorder);
router.get("/:id", controller.getById);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

// Images : illustration, fond
router.post("/:id/image", uploadImage.single("image"), controller.uploadImageField("image"));
router.delete("/:id/image", controller.deleteImageField("image"));
router.post("/:id/background", uploadBackground.single("background"), controller.uploadImageField("background"));
router.delete("/:id/background", controller.deleteImageField("background"));

module.exports = router;
