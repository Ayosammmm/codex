const express = require("express");
const router = express.Router();
const powerRanksController = require("../controllers/powerRanksController");

router.post("/", powerRanksController.create);
router.get("/", powerRanksController.getAll);
router.put("/reorder", powerRanksController.reorder);
router.get("/:id", powerRanksController.getById);
router.put("/:id", powerRanksController.update);
router.delete("/:id", powerRanksController.delete);

module.exports = router;