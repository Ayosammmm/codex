const express = require("express");
const cors = require("cors");
const sequelize = require("./config/database");

// Importer les modèles pour s'assurer qu'ils sont chargés
require("./models/CharacterGroup");
require("./models/CharacterRelation");
require("./models/Creature");
require("./models/Episode");
require("./models/Event");
require("./models/EpisodeCharacter");
require("./models/Story");
require("./models/EntityPhoto");
require("./models/User");
require("./models/EntityEditor");
require("./models/EntityCollection");
const { upgradeMessagesSchema } = require("./models/Message");
require("./models/Roleplay");
require("./models/Mod");
const { authenticate, authorize } = require("./middlewares/authorize");
const bootstrapAdmin = require("./services/bootstrapAdmin");
const { setupRealtime } = require("./services/realtime");


const characterRoutes = require("./routes/characterRoutes");
const placesRoutes = require("./routes/placesRoutes");
const placesTypeRoutes = require("./routes/placesTypeRoutes");
const groupsRoutes = require("./routes/groupsRoutes");
const groupsTypeRoutes = require("./routes/groupsTypeRoutes");
const gendersRoutes = require("./routes/gendersRoutes");
const speciesRoutes = require("./routes/speciesRoutes");
const statusesRoutes = require("./routes/statusesRoutes");
const alignmentsRoutes = require("./routes/alignmentsRoutes");
const powerRanksRoutes = require("./routes/powerRanksRoutes");
const universesRoutes = require("./routes/universesRoutes");
const creaturesRoutes = require("./routes/creaturesRoutes");
const episodesRoutes = require("./routes/episodesRoutes");
const eventsRoutes = require("./routes/eventsRoutes");
const storiesRoutes = require("./routes/storiesRoutes");
const entityPhotosRoutes = require("./routes/entityPhotosRoutes");
const imageProxyRoutes = require("./routes/imageProxyRoutes");
const authRoutes = require("./routes/authRoutes");
const usersRoutes = require("./routes/usersRoutes");
const editorsRoutes = require("./routes/editorsRoutes");
const collectionsRoutes = require("./routes/collectionsRoutes");
const roleplayRoutes = require("./routes/roleplayRoutes");
const messagesRoutes = require("./routes/messagesRoutes");
const modsRoutes = require("./routes/modsRoutes");
const customEntitiesRoutes = require("./routes/customEntitiesRoutes");
const entityMetadataRoutes = require("./routes/entityMetadataRoutes");
const modRecordsRoutes = require("./routes/modRecordsRoutes");
const { serveModFiles } = require("./services/modFiles");
const { serveThumbnail, pruneThumbnails } = require("./services/thumbnails");

const app = express();
app.use(cors());
// L'import d'univers et l'installation d'un mod lisent eux-mêmes le corps brut (archive ZIP) : pas de parsing ici
const RAW_BODY = new Set(["/api/universes/import", "/api/mods"]);
const jsonParser = express.json();
// Données des pages de mods (ex. simulations complètes) : corps plus volumineux
const largeJsonParser = express.json({ limit: "5mb" });
app.use((req, res, next) => {
  if (RAW_BODY.has(req.path) && req.method === "POST") return next();
  if (req.path.startsWith("/api/mod-records")) return largeJsonParser(req, res, next);
  return jsonParser(req, res, next);
});

// Comptes et droits : toute l'API demande une connexion (voir middlewares/authorize.js)
app.use("/api", authenticate, authorize);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/editors", editorsRoutes);

app.use("/api/characters", characterRoutes);
app.use("/api/places", placesRoutes);
app.use("/api/places_type", placesTypeRoutes);
app.use("/api/groups", groupsRoutes);
app.use("/api/groups_type", groupsTypeRoutes);
app.use("/api/species", speciesRoutes);
app.use("/api/genders", gendersRoutes);
app.use("/api/statuses", statusesRoutes);
app.use("/api/alignments", alignmentsRoutes);
app.use("/api/power-ranks", powerRanksRoutes);
app.use("/api/collections", collectionsRoutes);
app.use("/api/roleplay", roleplayRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/mods", modsRoutes);
app.use("/api/custom-entities", customEntitiesRoutes);
app.use("/api/entity-metadata", entityMetadataRoutes);
app.use("/api/mod-records", modRecordsRoutes);
app.use("/api/universes", universesRoutes);
app.use("/api/creatures", creaturesRoutes);
app.use("/api/episodes", episodesRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/stories", storiesRoutes);
app.use("/api/entity-photos", entityPhotosRoutes);
app.use("/api/image-proxy", imageProxyRoutes);

// Vignettes redimensionnées à la demande (/uploads/...?w=128), sinon le fichier d'origine
app.use("/uploads", serveThumbnail, express.static("uploads"));
// Fichiers des mods installés (pages en iframe isolée, sans accès à la session : voir services/modFiles.js)
app.use("/mod-files", serveModFiles);

// Erreurs non gérées par les contrôleurs (upload refusé, JSON trop volumineux...) : réponse JSON
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  const status = err.status || err.statusCode || (err.name === "MulterError" ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: err.message || "Erreur serveur" });
});

sequelize.sync({ alter: true }) // crée/maj la table automatiquement
  .then(upgradeMessagesSchema) // colonnes que `alter` ne met pas à jour (voir models/Message.js)
  .then(() => console.log("DB connected"))
  .then(bootstrapAdmin) // premier démarrage : super admin depuis le .env
  .catch((err) => console.error(err));

const PORT = Number(process.env.PORT) || 5000;
const server = app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
pruneThumbnails().catch((err) => console.error("Nettoyage des vignettes:", err.message));
// Temps réel du roleplay (WebSocket sur /api/ws)
setupRealtime(server);
