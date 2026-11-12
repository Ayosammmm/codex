const express = require("express");
const router = express.Router();
const controller = require("../controllers/editorsController");

router.get("/:entityType", controller.listByType);
router.get("/:entityType/:entityId", controller.list);
router.put("/:entityType/:entityId", controller.set);

module.exports = router;
