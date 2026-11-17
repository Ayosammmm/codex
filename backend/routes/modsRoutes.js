const express = require("express");
const router = express.Router();
const modsController = require("../controllers/modsController");

// Installation : corps brut (archive ZIP), lu par le contrôleur (pas par express.json, voir index.js)
router.get("/", modsController.list);
router.post("/", modsController.install);
router.get("/:id", modsController.get);
router.delete("/:id", modsController.remove);

module.exports = router;
