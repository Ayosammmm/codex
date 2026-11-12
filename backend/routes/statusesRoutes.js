const express = require("express");
const router = express.Router();
const statusesController = require("../controllers/statusesController");

router.post("/", statusesController.create);
router.get("/", statusesController.getAll);
router.put("/reorder", statusesController.reorder);
router.get("/:id", statusesController.getById);
router.put("/:id", statusesController.update);
router.delete("/:id", statusesController.delete);

module.exports = router;