const fs = require("fs");
const path = require("path");
const Character = require("../models/Character");
const CharacterForm = require("../models/CharacterForm");
const Specie = require("../models/Specie");
const { MessageCharacter } = require("../models/Message");
const { COPIED_FIELDS } = require("../models/characterProfile");
const { deleteUpload } = require("../services/universeTransfer");
const { loadCharacterDetail, cleanBody } = require("./characterController");

/**
 * Autres formes d'un personnage (/characters/:id/forms). Chaque réponse renvoie la fiche complète
 * du personnage (avec toutes ses formes), comme les routes du personnage.
 */

const UPLOADS_ROOT = path.resolve(__dirname, "..", "uploads");
// Dossiers d'envoi des fichiers d'une forme (voir routes/characterRoutes.js)
const FILE_FOLDERS = { avatar: "characters/forms/avatars", background: "characters/forms/backgrounds", themeSound: "characters/sounds" };

/** Copie d'un fichier /uploads/... (le son repris de la forme par défaut), ou null. */
function copyUpload(uploadPath) {
  if (typeof uploadPath !== "string" || !uploadPath.startsWith("/uploads/")) return null;
  const abs = path.resolve(UPLOADS_ROOT, uploadPath.slice("/uploads/".length));
  if (!abs.startsWith(UPLOADS_ROOT + path.sep) || !fs.existsSync(abs)) return null;
  const copyName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}-${path.basename(abs).replace(/^\d+-/, "")}`;
  fs.copyFileSync(abs, path.join(path.dirname(abs), copyName));
  return `${path.posix.dirname(uploadPath)}/${copyName}`;
}

const toIds = (list) => [...new Set((Array.isArray(list) ? list : []).map((v) => parseInt(v, 10)).filter((v) => v > 0))];

/** Charge la forme `:formId` du personnage `:id` (ou répond 404). */
async function findForm(req, res) {
  const form = await CharacterForm.findOne({ where: { id: req.params.formId, character_id: req.params.id } });
  if (!form) res.status(404).json({ error: "Forme introuvable" });
  return form;
}

const respond = async (res, characterId) => res.json(await loadCharacterDetail(characterId));

// AJOUT : copie de la forme par défaut (tout sauf les images), à éditer ensuite
exports.createForm = async (req, res) => {
  try {
    const character = await Character.findByPk(req.params.id, { include: [{ model: Specie, as: "species" }] });
    if (!character) return res.status(404).json({ error: "Character not found" });

    const count = await CharacterForm.count({ where: { character_id: character.id } });
    const maxPosition = (await CharacterForm.max("position", { where: { character_id: character.id } })) || 0;
    const values = Object.fromEntries(COPIED_FIELDS.map((key) => [key, character[key]]));
    const formName = typeof req.body?.formName === "string" ? req.body.formName.trim().slice(0, 255) : "";

    const form = await CharacterForm.create({
      ...values,
      character_id: character.id,
      universe_id: character.universe_id,
      position: maxPosition + 1,
      formName: formName || `Forme ${count + 2}`,
      themeSound: copyUpload(character.themeSound),
    });
    await form.setSpecies(character.species || []);

    res.status(201);
    await respond(res, character.id);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// MODIFICATION : mêmes champs que le profil du personnage, plus ses espèces
exports.updateForm = async (req, res) => {
  try {
    const form = await findForm(req, res);
    if (!form) return;
    const data = cleanBody(req.body || {});
    const values = {};
    for (const key of [...COPIED_FIELDS, "formName"]) if (key in data) values[key] = data[key];
    const merged = { firstname: form.firstname, name: form.name, ...values };
    if (!merged.firstname && !merged.name) {
      return res.status(400).json({ error: "Un nom ou un prénom est requis." });
    }
    await form.update(values);
    if (Array.isArray(req.body?.specieIds)) {
      await form.setSpecies(await Specie.findAll({ where: { id: toIds(req.body.specieIds) } }));
    }
    await respond(res, form.character_id);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// SUPPRESSION : la forme et ses fichiers
exports.deleteForm = async (req, res) => {
  try {
    const form = await findForm(req, res);
    if (!form) return;
    await form.destroy();
    // Messages écrits dans cette forme : le personnage y reprend sa forme par défaut
    await MessageCharacter.update({ formId: null }, { where: { formId: form.id } });
    [form.avatar, form.background, form.themeSound].forEach(deleteUpload);
    await respond(res, form.character_id);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// ORDRE : `ids` = toutes les formes du personnage, dans le nouvel ordre
exports.reorderForms = async (req, res) => {
  try {
    const ids = toIds(req.body?.ids);
    await Promise.all(ids.map((id, i) => CharacterForm.update({ position: i + 1 }, { where: { id, character_id: req.params.id } })));
    await respond(res, req.params.id);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// FICHIERS (avatar, fond, thème musical) : remplace l'ancien fichier, ou le retire
exports.uploadFile = (field) => async (req, res) => {
  const newPath = req.file ? `/uploads/${FILE_FOLDERS[field]}/${req.file.filename}` : null;
  try {
    if (!newPath) return res.status(400).json({ error: "Aucun fichier envoyé" });
    const form = await findForm(req, res);
    if (!form) return deleteUpload(newPath);
    const oldPath = form[field];
    await form.update({ [field]: newPath });
    if (oldPath) deleteUpload(oldPath);
    await respond(res, form.character_id);
  } catch (err) {
    if (newPath) deleteUpload(newPath);
    res.status(500).json({ error: err.message });
  }
};

exports.deleteFile = (field) => async (req, res) => {
  try {
    const form = await findForm(req, res);
    if (!form) return;
    const oldPath = form[field];
    await form.update({ [field]: null });
    if (oldPath) deleteUpload(oldPath);
    await respond(res, form.character_id);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
