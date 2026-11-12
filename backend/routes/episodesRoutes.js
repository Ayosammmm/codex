const express = require("express");
const router = express.Router();
const controller = require("../controllers/episodesController");

router.post("/", controller.create);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

// Image de fond
const { createUploadMiddleware } = require("../middlewares/upload");
const uploadEpisodeBackground = createUploadMiddleware("episodes/backgrounds", true);
router.post("/:id/background", uploadEpisodeBackground.single("background"), controller.uploadImageField("background"));
router.delete("/:id/background", controller.deleteImageField("background"));

module.exports = router;

