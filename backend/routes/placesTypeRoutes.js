const express = require("express");
const router = express.Router();
const placesTypeController = require("../controllers/placesTypeController");

router.post("/", placesTypeController.create);
router.get("/", placesTypeController.getAll);
router.put("/reorder", placesTypeController.reorder);
router.get("/:id", placesTypeController.getById);
router.put("/:id", placesTypeController.update);
router.delete("/:id", placesTypeController.delete);

module.exports = router;