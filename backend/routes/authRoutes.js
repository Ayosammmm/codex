const express = require("express");
const router = express.Router();
const controller = require("../controllers/authController");

router.post("/login", controller.login);
router.get("/me", controller.me);
router.put("/password", controller.changePassword);

module.exports = router;
