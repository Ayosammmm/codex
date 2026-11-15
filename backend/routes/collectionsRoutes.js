const express = require("express");
const router = express.Router();
const collectionsController = require("../controllers/collectionsController");

// Liens entité ↔ collection (avant /:id). Droits : ceux de l'entité (middlewares/authorize.js)
router.get("/links", collectionsController.getLinks);
router.put("/links/:entityType/:entityId", collectionsController.setLinks);

router.post("/", collectionsController.create);
router.get("/", collectionsController.getAll);
router.put("/reorder", collectionsController.reorder);
router.get("/:id", collectionsController.getById);
router.put("/:id", collectionsController.update);
router.delete("/:id", collectionsController.delete);

module.exports = router;
