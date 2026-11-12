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
