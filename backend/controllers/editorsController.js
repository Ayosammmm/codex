const User = require("../models/User");
const EntityEditor = require("../models/EntityEditor");
const { ENTITY_TYPES, canEditEntity } = require("../services/auth");

const parse = (req) => ({ entityType: req.params.entityType, entityId: parseInt(req.params.entityId, 10) });

// GET /editors/:entityType/:entityId → éditeurs liés [{ id, displayName, username }]
exports.list = async (req, res) => {
  const { entityType, entityId } = parse(req);
  if (!ENTITY_TYPES.includes(entityType) || !entityId) return res.status(400).json({ error: "Entité invalide." });
  const links = await EntityEditor.findAll({ where: { entityType, entityId } });
  const users = await User.findAll({ where: { id: links.map((l) => l.userId) }, attributes: ["id", "displayName", "username"], order: [["displayName", "ASC"]] });
  res.json(users);
};

// GET /editors/:entityType → éditeurs de toutes les entités de ce type : { [entityId]: [{ id, displayName, username }] }
// (colonne « Éditeurs » des tableaux : une seule requête pour toute la liste)
exports.listByType = async (req, res) => {
  try {
    const { entityType } = req.params;
    if (!ENTITY_TYPES.includes(entityType)) return res.status(400).json({ error: "Type d'entité invalide." });
    const links = await EntityEditor.findAll({
      where: { entityType },
      include: [{ model: User, attributes: ["id", "displayName", "username"] }],
    });
    const byEntity = {};
    for (const link of links) {
      if (!link.User) continue;
      (byEntity[link.entityId] ||= []).push(link.User);
    }
    for (const users of Object.values(byEntity)) users.sort((a, b) => a.displayName.localeCompare(b.displayName, "fr"));
    res.json(byEntity);
  } catch (error) {
    console.error("Erreur éditeurs:", error);
    res.status(500).json({ error: error.message });
  }
};

// PUT /editors/:entityType/:entityId { userIds } — admins ou éditeurs déjà liés à l'entité
exports.set = async (req, res) => {
  try {
    const { entityType, entityId } = parse(req);
    if (!ENTITY_TYPES.includes(entityType) || !entityId) return res.status(400).json({ error: "Entité invalide." });
    if (!(await canEditEntity(req.user, entityType, entityId))) return res.status(403).json({ error: "Vous ne pouvez pas modifier les éditeurs de cette entité." });
    const ids = Array.isArray(req.body.userIds) ? [...new Set(req.body.userIds.map(Number).filter(Number.isInteger))] : [];
    // Seuls des comptes éditeurs peuvent être liés
    const editors = await User.findAll({ where: { id: ids, role: "editor" }, attributes: ["id"] });
    await EntityEditor.destroy({ where: { entityType, entityId } });
    await EntityEditor.bulkCreate(editors.map((u) => ({ entityType, entityId, userId: u.id })));
    req.params = { entityType, entityId };
    return exports.list(req, res);
  } catch (error) {
    console.error("Erreur éditeurs:", error);
    res.status(500).json({ error: error.message });
  }
};
