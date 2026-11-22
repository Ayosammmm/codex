const express = require("express");
const router = express.Router();
const roleplay = require("../controllers/roleplayController");
const { createAttachmentsMiddleware } = require("../middlewares/upload");

// Pièces jointes d'un envoi : une image (5 Mo) et/ou un son (20 Mo), joints au dernier message
const uploadAttachments = createAttachmentsMiddleware({ imageFolder: roleplay.IMAGE_FOLDER, soundFolder: roleplay.SOUND_FOLDER });

// Roleplay écrit. Écriture : éditeurs et admins (middlewares/authorize.js), droits fins dans le contrôleur.
router.get("/overview", roleplay.overview);
router.get("/sounds", roleplay.sceneSounds);
router.get("/places/:placeId/messages", roleplay.listMessages);
router.post("/places/:placeId/messages", uploadAttachments, roleplay.createMessages);
router.put("/places/:placeId/read", roleplay.markRead);
router.put("/messages/:id", roleplay.updateMessage);
router.delete("/messages/:id", roleplay.deleteMessage);
router.get("/characters/:characterId", roleplay.characterActivity);
router.get("/episodes/:episodeId/scenes", roleplay.episodeScenes);
router.put("/episodes/:episodeId/scenes", roleplay.setEpisodeScenes);
router.post("/scenes", roleplay.createScene);
router.get("/scenes/:id", roleplay.getScene);
// Scène hors roleplay : messages écrits directement dans la scène
router.post("/scenes/:id/messages", uploadAttachments, roleplay.createSceneMessages);
router.get("/scenes/:id/neighbours", roleplay.sceneNeighbours);
router.put("/scenes/:id", roleplay.updateScene);
router.delete("/scenes/:id", roleplay.deleteScene);

module.exports = router;
