const express = require("express");
const router = express.Router();
const messages = require("../services/messages");

// Messages (système commun : roleplay, récits d'épisodes) : modification et suppression d'un message.
// Auteur, admin, ou (récit d'épisode) qui peut modifier l'épisode : vérifié par services/messages.js.
router.put("/:id", messages.updateMessage);
router.delete("/:id", messages.deleteMessage);

module.exports = router;
