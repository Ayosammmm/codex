const express = require("express");
const router = express.Router();
const universesController = require("../controllers/universesController");
const { createUploadMiddleware } = require("../middlewares/upload");

// Images de l'univers : champ en base -> sous-dossier d'uploads
const IMAGE_FOLDERS = {
  logo: "universes/logos",
  banner: "universes/banners",
  background: "universes/backgrounds",
};

router.post("/", universesController.create);
router.get("/", universesController.getAll);
// Import : le corps JSON est parsé avec une limite élevée dans index.js
router.post("/import", universesController.import);
router.get("/:id", universesController.getById);
router.put("/:id", universesController.update);
router.delete("/:id", universesController.delete);
router.get("/:id/export", universesController.export);
router.post("/:id/duplicate", universesController.duplicate);

for (const [field, folder] of Object.entries(IMAGE_FOLDERS)) {
  const upload = createUploadMiddleware(folder, true);
  router.post(`/:id/${field}`, upload.single(field), universesController.uploadImage(field, folder));
  router.delete(`/:id/${field}`, universesController.deleteImage(field));
}

module.exports = router;
