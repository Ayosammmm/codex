const express = require("express");
const router = express.Router();
const controller = require("../controllers/customEntitiesController");
const { createUploadMiddleware } = require("../middlewares/upload");

router.post("/", controller.create);
router.get("/", controller.getAll);
router.get("/:id", controller.getById);
router.put("/:id", controller.update);
router.delete("/:id", controller.delete);

// Images : illustration, fond
for (const [field, folder] of Object.entries(controller.IMAGE_FOLDERS)) {
  const upload = createUploadMiddleware(folder, true);
  router.post(`/:id/${field}`, upload.single(field), controller.uploadImageField(field));
  router.delete(`/:id/${field}`, controller.deleteImageField(field));
}

module.exports = router;
