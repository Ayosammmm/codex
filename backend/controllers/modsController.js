const { Mod } = require('../models/Mod');
const Univers = require('../models/Univers');
const modStore = require('../services/modStore');

const sendError = (res, error, label) => {
  if (!error.status) console.error(`Erreur ${label} (mods):`, error);
  res.status(error.status || 500).json({ error: error.message });
};

const toJSON = (mod) => {
  const { manifest, ...rest } = mod.toJSON();
  return { ...rest, ...manifest, installedAt: rest.createdAt, updatedAt: rest.updatedAt };
};

// GET /mods → mods installés (manifestes normalisés), tout compte connecté
exports.list = async (req, res) => {
  try {
    const mods = await Mod.findAll({ order: [['name', 'ASC']] });
    res.json(mods.map(toJSON));
  } catch (error) {
    sendError(res, error, 'list');
  }
};

// GET /mods/:id
exports.get = async (req, res) => {
  try {
    const mod = await Mod.findByPk(req.params.id);
    if (!mod) return res.status(404).json({ error: 'Mod non trouvé' });
    res.json(toJSON(mod));
  } catch (error) {
    sendError(res, error, 'get');
  }
};

// POST /mods (corps brut : archive ZIP) → installe ou met à jour. Super admins (middlewares/authorize.js)
exports.install = async (req, res) => {
  try {
    const mod = await modStore.installFromStream(req, { userId: req.user?.id });
    res.status(201).json(toJSON(mod));
  } catch (error) {
    sendError(res, error, 'install');
  }
};

// DELETE /mods/:id → désinstalle (les données des univers restent, masquées, jusqu'à une réinstallation)
exports.remove = async (req, res) => {
  try {
    const mod = await modStore.uninstall(req.params.id);
    if (!mod) return res.status(404).json({ error: 'Mod non trouvé' });
    // Le mod n'est plus actif nulle part
    const universes = await Univers.findAll({ attributes: ['id', 'mods'] });
    for (const universe of universes) {
      if (universe.mods && req.params.id in universe.mods) {
        const { [req.params.id]: _removed, ...rest } = universe.mods;
        await universe.update({ mods: Object.keys(rest).length ? rest : null });
      }
    }
    res.json({ message: 'Mod désinstallé' });
  } catch (error) {
    sendError(res, error, 'remove');
  }
};
