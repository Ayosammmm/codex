const express = require("express");
const router = express.Router();
const gendersController = require("../controllers/gendersController");

router.post("/", gendersController.create);
router.get("/", gendersController.getAll);
router.put("/reorder", gendersController.reorder);
router.get("/:id", gendersController.getById);
router.put("/:id", gendersController.update);
router.delete("/:id", gendersController.delete);

module.exports = router;