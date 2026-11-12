const { deleteUpload } = require("../services/universeTransfer");

/**
 * Routes d'images d'une entité (logo, bannière, fond...) : upload qui remplace l'ancien fichier,
 * et suppression. `folders` : { champ: sous-dossier d'uploads } ; `loadDetail(id)` : réponse renvoyée.
 */
function imageHandlers({ Model, folders, loadDetail, notFound }) {
  const upload = (field) => async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Aucun fichier envoyé" });
      const newPath = `/uploads/${folders[field]}/${req.file.filename}`;
      const entity = await Model.findByPk(req.params.id);
      if (!entity) {
        deleteUpload(newPath);
        return res.status(404).json({ error: notFound });
      }
      const oldPath = entity[field];
      await entity.update({ [field]: newPath });
      if (oldPath) deleteUpload(oldPath);
      const detail = await loadDetail(entity.id);
      // `success` et `[champ]` : compatibilité avec l'ancien frontend
      res.json({ ...detail, success: true, [field]: newPath });
    } catch (error) {
      console.error(`Erreur upload ${field}:`, error);
      res.status(500).json({ error: error.message });
    }
  };

  const remove = (field) => async (req, res) => {
    try {
      const entity = await Model.findByPk(req.params.id);
      if (!entity) return res.status(404).json({ error: notFound });
      const oldPath = entity[field];
      await entity.update({ [field]: null });
      if (oldPath) deleteUpload(oldPath);
      res.json({ ...(await loadDetail(entity.id)), success: true });
    } catch (error) {
      console.error(`Erreur suppression ${field}:`, error);
      res.status(500).json({ error: error.message });
    }
  };

  return { upload, remove };
}

module.exports = { imageHandlers };
