const Univers = require('../models/Univers');
const { seedUniverseDefaults } = require('../services/universeDefaults');
const transfer = require('../services/universeTransfer');
const universeArchive = require('../services/universeArchive');

// Anciens booléens conservés pour compatibilité, synchronisés avec l'objet `modules`
const LEGACY_FLAGS = {
  personality: 'personalityModuleEnabled',
  creatures: 'bestiaryEnabled',
  stories: 'storiesEnabled',
};

// Ne garde que des booléens et dérive les anciens flags
const buildModuleData = (modules) => {
  const clean = {};
  for (const [key, value] of Object.entries(modules || {})) {
    if (typeof value === 'boolean') clean[key] = value;
  }
  const data = { modules: clean };
  for (const [key, flag] of Object.entries(LEGACY_FLAGS)) {
    if (clean[key] !== undefined) data[flag] = clean[key];
  }
  return data;
};

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;
const COLOR_KEYS = ['primary', 'secondary', 'tertiary'];

// Champs d'apparence (thème, couleurs, couleur de fond). Lève une erreur 400 si invalide.
const buildAppearanceData = (body) => {
  const data = {};
  if (body.theme !== undefined) {
    if (typeof body.theme !== 'string' || !/^[a-z0-9-]{1,32}$/.test(body.theme)) {
      throw Object.assign(new Error('Thème invalide'), { status: 400 });
    }
    data.theme = body.theme;
  }
  if (body.colors !== undefined) {
    const colors = {};
    for (const key of COLOR_KEYS) {
      const value = body.colors?.[key];
      if (value == null || value === '') continue;
      if (!HEX_COLOR.test(value)) throw Object.assign(new Error(`Couleur "${key}" invalide`), { status: 400 });
      colors[key] = value.toLowerCase();
    }
    data.colors = Object.keys(colors).length ? colors : null;
  }
  if (body.backgroundColor !== undefined) {
    if (body.backgroundColor && !HEX_COLOR.test(body.backgroundColor)) {
      throw Object.assign(new Error('Couleur de fond invalide'), { status: 400 });
    }
    data.backgroundColor = body.backgroundColor ? body.backgroundColor.toLowerCase() : null;
  }
  if (body.scrimColor !== undefined) {
    if (body.scrimColor && !HEX_COLOR.test(body.scrimColor)) {
      throw Object.assign(new Error('Couleur du voile invalide'), { status: 400 });
    }
    data.scrimColor = body.scrimColor ? body.scrimColor.toLowerCase() : null;
  }
  return data;
};

// Mods activés : { [modId]: true } (seuls les mods activés sont gardés)
const buildModsData = (mods) => {
  if (!mods || typeof mods !== 'object' || Array.isArray(mods)) return null;
  const clean = {};
  for (const [id, on] of Object.entries(mods)) if (on === true && /^[a-z0-9][a-z0-9-]{1,39}$/.test(id)) clean[id] = true;
  return Object.keys(clean).length ? clean : null;
};

const sendError = (res, error, label) => {
  if (!error.status) console.error(`Erreur ${label}:`, error);
  res.status(error.status || 500).json({ error: error.message });
};

// Récupérer tous les univers
exports.getAll = async (req, res) => {
  try {
    const universes = await Univers.findAll({
      order: [['id', 'ASC']],
    });
    if (!req.query.stats) return res.json(universes);

    // ?stats=1 : ajoute le nombre d'entités par univers
    const stats = await transfer.countByUniverse();
    res.json(universes.map((u) => ({ ...u.toJSON(), stats: stats[u.id] || {} })));
  } catch (error) {
    console.error('Erreur getAll:', error);
    res.status(500).json({ error: error.message });
  }
};

// Récupérer un univers par ID
exports.getById = async (req, res) => {
  try {
    const universe = await Univers.findByPk(req.params.id);
    if (!universe) return res.status(404).json({ error: 'Univers non trouvé' });
    res.json(universe);
  } catch (error) {
    console.error('Erreur getById:', error);
    res.status(500).json({ error: error.message });
  }
};

// Créer un nouvel univers
exports.create = async (req, res) => {
  try {
    const { name, description, modules, personalityModuleEnabled, bestiaryEnabled, storiesEnabled } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Le champ "name" est requis' });
    }

    const newUnivers = await Univers.create({
      name: name.trim(),
      description: description || null,
      personalityModuleEnabled: !!personalityModuleEnabled,
      bestiaryEnabled: !!bestiaryEnabled,
      storiesEnabled: !!storiesEnabled,
      ...(modules && typeof modules === 'object' ? buildModuleData(modules) : {}),
      ...(req.body.mods !== undefined && { mods: buildModsData(req.body.mods) }),
      ...buildAppearanceData(req.body),
    });
    // Valeurs de départ (genres, statuts, rangs...), sauf si on les refuse explicitement
    if (req.body.withDefaults !== false) await seedUniverseDefaults(newUnivers.id);
    res.status(201).json(newUnivers);
  } catch (error) {
    sendError(res, error, 'create');
  }
};

// Mettre à jour un univers
exports.update = async (req, res) => {
  try {
    const universe = await Univers.findByPk(req.params.id);
    if (!universe) return res.status(404).json({ error: 'Univers non trouvé' });

    const { name, description, modules, personalityModuleEnabled, bestiaryEnabled, storiesEnabled } = req.body;
    if (name !== undefined && (!name || !name.trim())) {
      return res.status(400).json({ error: 'Le champ "name" est requis' });
    }

    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description || null;
    if (personalityModuleEnabled !== undefined) updateData.personalityModuleEnabled = personalityModuleEnabled;
    if (bestiaryEnabled !== undefined) updateData.bestiaryEnabled = bestiaryEnabled;
    if (storiesEnabled !== undefined) updateData.storiesEnabled = storiesEnabled;
    if (modules && typeof modules === 'object') Object.assign(updateData, buildModuleData(modules));
    if (req.body.mods !== undefined) updateData.mods = buildModsData(req.body.mods);
    Object.assign(updateData, buildAppearanceData(req.body));

    await universe.update(updateData);
    res.json(universe);
  } catch (error) {
    sendError(res, error, 'update');
  }
};

// Supprimer un univers et toutes ses entités liées (liaisons, photos et images comprises)
exports.delete = async (req, res) => {
  try {
    const deleted = await transfer.deleteUniverse(Number(req.params.id));
    if (!deleted) return res.status(404).json({ error: 'Univers non trouvé' });
    res.json({ message: 'Univers supprimé avec succès', deleted });
  } catch (error) {
    sendError(res, error, 'delete');
  }
};

// Images de l'univers : logo, bannière, image de fond
// `folder` : sous-dossier d'uploads utilisé par le middleware multer de la route
exports.uploadImage = (field, folder) => async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'Aucun fichier envoyé' });
    const newPath = `/uploads/${folder}/${req.file.filename}`;

    const universe = await Univers.findByPk(req.params.id);
    if (!universe) {
      transfer.deleteUpload(newPath);
      return res.status(404).json({ error: 'Univers non trouvé' });
    }

    const oldPath = universe[field];
    await universe.update({ [field]: newPath });
    if (oldPath) transfer.deleteUpload(oldPath);
    res.json(universe);
  } catch (error) {
    sendError(res, error, `upload ${field}`);
  }
};

exports.deleteImage = (field) => async (req, res) => {
  try {
    const universe = await Univers.findByPk(req.params.id);
    if (!universe) return res.status(404).json({ error: 'Univers non trouvé' });
    const oldPath = universe[field];
    await universe.update({ [field]: null });
    if (oldPath) transfer.deleteUpload(oldPath);
    res.json(universe);
  } catch (error) {
    sendError(res, error, `delete ${field}`);
  }
};

// Export d'un univers complet : archive ZIP (universe.json + dossier uploads/)
exports.export = async (req, res) => {
  try {
    const result = await universeArchive.createExportArchive(Number(req.params.id));
    if (!result) return res.status(404).json({ error: 'Univers non trouvé' });
    const { archive, name } = result;
    const slug = name.normalize('NFD').replace(/[^\w-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase() || 'univers';
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${slug}.codex.zip"`);
    archive.on('warning', (err) => console.warn('Export univers :', err.message));
    archive.on('error', (err) => {
      console.error('Erreur export:', err);
      res.destroy(err);
    });
    // Téléchargement interrompu : on arrête de construire l'archive
    res.on('close', () => {
      if (!res.writableFinished) archive.abort();
    });
    archive.pipe(res);
  } catch (error) {
    sendError(res, error, 'export');
  }
};

// Import d'un univers : corps brut = archive ZIP, ou ancien export JSON
exports.import = async (req, res) => {
  try {
    const name = typeof req.query.name === 'string' ? req.query.name : undefined;
    const universe = await universeArchive.importFromStream(req, { name });
    res.status(201).json(universe);
  } catch (error) {
    sendError(res, error, 'import');
  }
};

// Duplication d'un univers (entités, liaisons et images)
exports.duplicate = async (req, res) => {
  try {
    const name = typeof req.body?.name === 'string' && req.body.name.trim() ? req.body.name.trim() : undefined;
    const universe = await transfer.duplicateUniverse(Number(req.params.id), { name });
    if (!universe) return res.status(404).json({ error: 'Univers non trouvé' });
    res.status(201).json(universe);
  } catch (error) {
    sendError(res, error, 'duplicate');
  }
};

