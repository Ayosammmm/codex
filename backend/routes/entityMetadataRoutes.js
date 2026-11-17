const express = require("express");
const router = express.Router();
const controller = require("../controllers/entityMetadataController");

// Droits : ceux de l'entité (middlewares/authorize.js)
router.get("/", controller.list);
router.put("/:entityType/:entityId", controller.set);

module.exports = router;
