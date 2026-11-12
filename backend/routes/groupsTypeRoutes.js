const express = require("express");
const router = express.Router();
const groupsTypeController = require("../controllers/groupsTypeController");

router.post("/", groupsTypeController.create);
router.get("/", groupsTypeController.getAll);
router.put("/reorder", groupsTypeController.reorder);
router.get("/:id", groupsTypeController.getById);
router.put("/:id", groupsTypeController.update);
router.delete("/:id", groupsTypeController.delete);

module.exports = router;