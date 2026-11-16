const express = require("express");
const router = express.Router();
const roleplay = require("../controllers/roleplayController");

// Roleplay écrit. Écriture : éditeurs et admins (middlewares/authorize.js), droits fins dans le contrôleur.
router.get("/overview", roleplay.overview);
router.get("/places/:placeId/messages", roleplay.listMessages);
router.post("/places/:placeId/messages", roleplay.createMessage);
router.put("/places/:placeId/read", roleplay.markRead);
router.put("/messages/:id", roleplay.updateMessage);
router.delete("/messages/:id", roleplay.deleteMessage);
router.get("/characters/:characterId", roleplay.characterActivity);
router.get("/episodes/:episodeId/scenes", roleplay.episodeScenes);
router.put("/episodes/:episodeId/scenes", roleplay.setEpisodeScenes);
router.post("/scenes", roleplay.createScene);
router.get("/scenes/:id", roleplay.getScene);
router.put("/scenes/:id", roleplay.updateScene);
router.delete("/scenes/:id", roleplay.deleteScene);

module.exports = router;
