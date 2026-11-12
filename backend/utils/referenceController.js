const { isHexColor } = require("./colors");

/**
 * Contrôleur d'un référentiel d'univers (genres, statuts, types de lieux...).
 * - `fields` : champs modifiables en plus du nom ('color', 'description')
 * - Les éléments sont rangés par `position` (ordre choisi par l'utilisateur), puis par id.
 */
function referenceController(Model, { label, fields = [] }) {
  const notFound = `${label} non trouvé`;
  const order = [["position", "ASC"], ["id", "ASC"]];

  const pick = (body) => {
    const data = {};
    if (typeof body.name === "string") data.name = body.name.trim().slice(0, 255);
    if (fields.includes("color") && body.color !== undefined) data.color = isHexColor(body.color) ? body.color.toLowerCase() : "#000000";
    if (fields.includes("description") && body.description !== undefined) data.description = body.description?.trim() || null;
    return data;
  };

  const send500 = (res, error, action) => {
    console.error(`Erreur ${action} (${label}):`, error);
    res.status(500).json({ error: error.message });
  };

  return {
    getAll: async (req, res) => {
      try {
        const where = req.query.universe_id ? { universe_id: req.query.universe_id } : {};
        res.json(await Model.findAll({ where, order }));
      } catch (error) {
        send500(res, error, "getAll");
      }
    },

    getById: async (req, res) => {
      try {
        const item = await Model.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: notFound });
        res.json(item);
      } catch (error) {
        send500(res, error, "getById");
      }
    },

    create: async (req, res) => {
      try {
        const data = pick(req.body);
        if (!data.name) return res.status(400).json({ error: 'Le champ "name" est requis' });
        const universe_id = req.body.universe_id || null;
        // Éléments créés avant l'ordre manuel : on fige l'ordre actuel, puis le nouveau va à la fin
        const existing = await Model.findAll({ where: { universe_id }, order });
        if (existing.some((e) => e.position == null)) {
          await Promise.all(existing.map((e, i) => e.update({ position: i + 1 })));
        }
        const item = await Model.create({
          ...(fields.includes("color") && { color: "#000000" }),
          ...data,
          universe_id,
          position: existing.length + 1,
        });
        res.status(201).json(item);
      } catch (error) {
        send500(res, error, "create");
      }
    },

    update: async (req, res) => {
      try {
        const item = await Model.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: notFound });
        const data = pick(req.body);
        if ("name" in data && !data.name) return res.status(400).json({ error: 'Le champ "name" est requis' });
        await item.update(data);
        res.json(item);
      } catch (error) {
        send500(res, error, "update");
      }
    },

    delete: async (req, res) => {
      try {
        const item = await Model.findByPk(req.params.id);
        if (!item) return res.status(404).json({ error: notFound });
        await item.destroy();
        res.json({ message: `${label} supprimé avec succès` });
      } catch (error) {
        send500(res, error, "delete");
      }
    },

    /** Nouvel ordre : { ids: [id, id, ...] } (éléments d'un même univers). */
    reorder: async (req, res) => {
      try {
        const ids = Array.isArray(req.body.ids) ? req.body.ids.map(Number).filter(Number.isInteger) : [];
        await Promise.all(ids.map((id, index) => Model.update({ position: index + 1 }, { where: { id } })));
        const first = ids.length ? await Model.findByPk(ids[0]) : null;
        const where = first ? { universe_id: first.universe_id } : {};
        res.json(await Model.findAll({ where, order }));
      } catch (error) {
        send500(res, error, "reorder");
      }
    },
  };
}

module.exports = { referenceController };
