const express = require("express");
const router = express.Router();
const alignmentsController = require("../controllers/alignmentsController");

router.post("/", alignmentsController.create);
router.get("/", alignmentsController.getAll);
router.put("/reorder", alignmentsController.reorder);
router.get("/:id", alignmentsController.getById);
router.put("/:id", alignmentsController.update);
router.delete("/:id", alignmentsController.delete);

module.exports = router;