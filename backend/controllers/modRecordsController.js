const { ModRecord } = require("../models/Mod");
const { activeManifest } = require("../services/modAccess");
const { isAdmin } = require("../services/auth");

/**
 * Données libres des pages de mods (ex. simulations enregistrées), rangées par univers, mod et collection.
 * Lecture : tout compte connecté. Création : éditeurs et admins (middlewares/authorize.js).
 * Modification / suppression : l'auteur de l'enregistrement ou un admin.
 */

const COLLECTION = /^[a-z0-9][a-z0-9_-]{0,39}$/;
const MAX_DATA_BYTES = 4 * 1024 ** 2;

const sendError = (res, error, label) => {
  if (!error.status) console.error(`Erreur ${label} (données de mod):`, error);
  res.status(error.status || 500).json({ error: error.message });
};

const author = { model: ModRecord.associations.author.target, as: "author", attributes: ["id", "displayName"] };

const checkData = (data) => {
  if (data === undefined) return "Données manquantes.";
  if (JSON.stringify(data).length > MAX_DATA_BYTES) return "Données trop volumineuses (4 Mo maximum).";
  return null;
};

const canChange = (user, record) => isAdmin(user) || (record.createdBy != null && record.createdBy === user?.id);

// GET /mod-records?universe_id=&mod=&collection= (sans `data` si ?summary=1)
exports.list = async (req, res) => {
  try {
    const universeId = Number(req.query.universe_id);
    if (!Number.isInteger(universeId) || typeof req.query.mod !== "string") {
      return res.status(400).json({ error: "Paramètres universe_id et mod requis" });
    }
    const where = { universe_id: universeId, modId: req.query.mod };
    if (typeof req.query.collection === "string") where.collection = req.query.collection;
    const attributes = req.query.summary ? { exclude: ["data"] } : undefined;
    res.json(await ModRecord.findAll({ where, attributes, include: [author], order: [["createdAt", "DESC"]] }));
  } catch (error) {
    sendError(res, error, "list");
  }
};

exports.get = async (req, res) => {
  try {
    const record = await ModRecord.findByPk(req.params.id, { include: [author] });
    if (!record) return res.status(404).json({ error: "Enregistrement non trouvé" });
    res.json(record);
  } catch (error) {
    sendError(res, error, "get");
  }
};

// POST /mod-records { universe_id, mod, collection, data }
exports.create = async (req, res) => {
  try {
    const universeId = Number(req.body.universe_id);
    const { mod, collection, data } = req.body;
    if (!Number.isInteger(universeId)) return res.status(400).json({ error: "Univers requis." });
    if (!COLLECTION.test(collection || "")) return res.status(400).json({ error: "Nom de collection invalide." });
    const problem = checkData(data);
    if (problem) return res.status(400).json({ error: problem });
    await activeManifest(universeId, mod);
    const record = await ModRecord.create({ universe_id: universeId, modId: mod, collection, data, createdBy: req.user.id });
    res.status(201).json(await ModRecord.findByPk(record.id, { include: [author] }));
  } catch (error) {
    sendError(res, error, "create");
  }
};

// PUT /mod-records/:id { data }
exports.update = async (req, res) => {
  try {
    const record = await ModRecord.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: "Enregistrement non trouvé" });
    if (!canChange(req.user, record)) return res.status(403).json({ error: "Seul l’auteur ou un admin peut modifier cet enregistrement." });
    const problem = checkData(req.body.data);
    if (problem) return res.status(400).json({ error: problem });
    await activeManifest(record.universe_id, record.modId);
    await record.update({ data: req.body.data });
    res.json(await ModRecord.findByPk(record.id, { include: [author] }));
  } catch (error) {
    sendError(res, error, "update");
  }
};

exports.remove = async (req, res) => {
  try {
    const record = await ModRecord.findByPk(req.params.id);
    if (!record) return res.status(404).json({ error: "Enregistrement non trouvé" });
    if (!canChange(req.user, record)) return res.status(403).json({ error: "Seul l’auteur ou un admin peut supprimer cet enregistrement." });
    await record.destroy();
    res.json({ message: "Enregistrement supprimé" });
  } catch (error) {
    sendError(res, error, "remove");
  }
};
