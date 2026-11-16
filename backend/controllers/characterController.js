const { Op } = require("sequelize");
const Character = require("../models/Character");
const Gender = require("../models/Gender");
const Status = require("../models/Status");
const PowerRank = require("../models/PowerRank");
const Alignment = require("../models/Alignment");
const Group = require("../models/Group");
const CharacterGroup = require("../models/CharacterGroup");
const { groupRoles, fallbackRole } = require("../utils/groupRoles");
const Place = require("../models/Place");
const Specie = require("../models/Specie");
const CharacterRelation = require("../models/CharacterRelation");
const EntityPhoto = require("../models/EntityPhoto");
const { deleteUpload } = require("../services/universeTransfer");
const { imageHandlers } = require("../utils/entityImages");
const { cleanColors } = require("../utils/colors");

// Relations entre personnages : nature (texte), archétype, intensité, ton, évolution
const RELATION_ATTRIBUTES = ["relation_type", "category", "intensity", "tone", "evolving"];
const RELATION_CATEGORIES = ["familiale", "amoureuse", "amicale", "hierarchique", "rivalite", "inimitie", "autre"];
const clampInt = (v, min, max) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : null;
};
/** Champs d'une relation envoyée par le client, nettoyés. */
const relationFields = (relation) => ({
  relation_type: String(relation.relationType).trim().slice(0, 255),
  category: RELATION_CATEGORIES.includes(relation.category) ? relation.category : null,
  intensity: relation.intensity == null || relation.intensity === "" ? null : clampInt(relation.intensity, 1, 5),
  tone: relation.tone == null || relation.tone === "" ? null : clampInt(relation.tone, -2, 2),
  evolving: Boolean(relation.evolving),
});
const fs = require("fs");

const toId = (v) => (v === "" || v == null ? null : parseInt(v, 10) || null);

/**
 * Groupes du personnage et son rôle dans chacun.
 * `groups` : [{ groupId, role }] (rôle inconnu du groupe = rôle par défaut du groupe) ;
 * `groupIds` : [id] (ancien format : les rôles déjà en place sont conservés).
 */
async function saveGroups(character, body) {
  if (Array.isArray(body.groups)) {
    const wanted = new Map();
    for (const m of body.groups) {
      const id = toId(m?.groupId);
      if (id && !wanted.has(id)) wanted.set(id, m.role);
    }
    const groups = wanted.size ? await Group.findAll({ where: { id: [...wanted.keys()] } }) : [];
    await CharacterGroup.destroy({ where: { character_id: character.id } });
    await CharacterGroup.bulkCreate(
      groups.map((g) => {
        const roles = groupRoles(g);
        const role = wanted.get(g.id);
        return { character_id: character.id, group_id: g.id, role: roles.some((r) => r.key === role) ? role : fallbackRole(roles) };
      }),
    );
  } else if (Array.isArray(body.groupIds)) {
    const groups = await Group.findAll({ where: { id: body.groupIds } });
    await character.setGroups(groups);
  }
}
const path = require("path");

// Définition d'une constante d'inclusion réutilisable
const defaultIncludes = [
  { model: Gender, as: "genders" },
  { model: Status, as: "statuses" },
  { model: PowerRank, as: "power_ranks" },
  { model: Alignment, as: "alignments" },
  { 
    model: Group, 
    as: "groups",
    through: { attributes: ["role"] },
  },
  { model: Place, as: "places" },
  { model: Specie, as: "species" },
  { 
    model: Character, 
    as: "relatedCharacters",
    through: { attributes: RELATION_ATTRIBUTES },
    attributes: ["id", "name", "firstname", "avatar", "colors"],
  },
  { 
    model: Character, 
    as: "relatedToCharacters",
    through: { attributes: RELATION_ATTRIBUTES },
    attributes: ["id", "name", "firstname", "avatar", "colors"],
  },
];

// Fonction helper pour normaliser les relations (combiner relatedCharacters et relatedToCharacters)
const normalizeRelations = (character) => {
  if (!character) return character;
  
  // Convertir en JSON pour éviter de modifier l'instance Sequelize directement
  const characterData = character.toJSON ? character.toJSON() : character;
  const relations = [];
  
  // Relations où ce personnage est character1
  if (characterData.relatedCharacters && Array.isArray(characterData.relatedCharacters)) {
    characterData.relatedCharacters.forEach((rel) => {
      relations.push({
        ...rel,
        CharacterRelation: rel.CharacterRelation,
      });
    });
  }
  
  // Relations où ce personnage est character2
  if (characterData.relatedToCharacters && Array.isArray(characterData.relatedToCharacters)) {
    characterData.relatedToCharacters.forEach((rel) => {
      relations.push({
        ...rel,
        CharacterRelation: rel.CharacterRelation,
      });
    });
  }
  
  // Remplacer relatedCharacters par la liste combinée
  characterData.relatedCharacters = relations;
  delete characterData.relatedToCharacters;
  
  return characterData;
};

// Convertit les champs vides ("") en null : un champ numérique vide (ex. âge) ferait échouer MySQL
const cleanBody = (body) => {
  const data = { ...body };
  for (const key of Object.keys(data)) {
    if (typeof data[key] === "string" && data[key].trim() === "") data[key] = null;
  }
  if ("colors" in data) data.colors = cleanColors(data.colors);
  if ("development" in data && !["statique", "dynamique"].includes(data.development)) data.development = null;
  // Les images passent par leurs routes dédiées
  delete data.avatar;
  delete data.background;
  return data;
};

const hasIdentity = (data) => !!(data.firstname || data.name);

// CREATE
exports.createCharacter = async (req, res) => {
  try {
    // Création du personnage
    const data = cleanBody(req.body);
    if (!hasIdentity(data)) {
      return res.status(400).json({ error: "Un nom ou un prénom est requis." });
    }
    const character = await Character.create(data);

    // 🔗 Groupes (et rôle dans chacun)
    await saveGroups(character, req.body);

    // 🔗 Espèces
    if (req.body.specieIds && Array.isArray(req.body.specieIds)) {
      const species = await Specie.findAll({ where: { id: req.body.specieIds } });
      await character.setSpecies(species);
    }

    // 🔗 Lieux
    if (req.body.placeIds && Array.isArray(req.body.placeIds)) {
      const places = await Place.findAll({ where: { id: req.body.placeIds } });
      await character.setPlaces(places);
    }

    // 🔗 Relations entre personnages
    if (req.body.relations && Array.isArray(req.body.relations)) {
      for (const relation of req.body.relations) {
        if (relation.characterId && relation.relationType) {
          const relatedCharacter = await Character.findByPk(relation.characterId);
          if (relatedCharacter && relatedCharacter.id !== character.id) {
            // Vérifier si la relation existe déjà (dans un sens ou l'autre)
            const existingRelation = await CharacterRelation.findOne({
              where: {
                [Op.or]: [
                  { character1_id: character.id, character2_id: relation.characterId },
                  { character1_id: relation.characterId, character2_id: character.id },
                ],
              },
            });

            if (!existingRelation) {
              await CharacterRelation.create({
                character1_id: character.id,
                character2_id: relation.characterId,
                ...relationFields(relation),
              });
            }
          }
        }
      }
    }

    // On recharge le personnage avec les associations
    const createdCharacter = await Character.findByPk(character.id, {
      include: defaultIncludes,
    });

    // Normaliser les relations
    const normalizedCharacter = normalizeRelations(createdCharacter);

    res.json(normalizedCharacter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ALL
exports.getCharacters = async (req, res) => {
  try {
    const whereClause = {};
    
    // Filtrer par universe_id si fourni dans les query params
    // Convertir en nombre et vérifier que ce n'est pas NaN, null, undefined, ou une chaîne vide
    if (req.query.universe_id) {
      const universeId = parseInt(req.query.universe_id, 10);
      if (!isNaN(universeId) && universeId > 0) {
        whereClause.universe_id = universeId;
      }
      // Si universe_id est fourni mais invalide, on ne filtre pas
      // (retourne tous les personnages - comportement par défaut pour compatibilité)
    }
    // Si universe_id n'est pas fourni, whereClause reste vide
    // et on retourne tous les personnages (comportement par défaut)
    
    const characters = await Character.findAll({
      where: whereClause,
      include: defaultIncludes,
    });
    
    // Normaliser les relations pour chaque personnage
    const normalizedCharacters = characters.map(char => normalizeRelations(char));
    
    res.json(normalizedCharacters);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ ONE
exports.getCharacter = async (req, res) => {
  try {
    const character = await Character.findByPk(req.params.id, {
      include: defaultIncludes,
    });
    if (character) {
      // Normaliser les relations
      const normalizedCharacter = normalizeRelations(character);
      res.json(normalizedCharacter);
    } else {
      res.status(404).json({ error: "Character not found" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
exports.updateCharacter = async (req, res) => {
  try {
    const character = await Character.findByPk(req.params.id);
    if (!character)
      return res.status(404).json({ error: "Character not found" });

    const data = cleanBody(req.body);
    const merged = { firstname: character.firstname, name: character.name, ...data };
    if (!hasIdentity(merged)) {
      return res.status(400).json({ error: "Un nom ou un prénom est requis." });
    }
    await character.update(data);

    // 🔗 Groupes (et rôle dans chacun)
    await saveGroups(character, req.body);

    // 🔗 Espèces
    if (req.body.specieIds && Array.isArray(req.body.specieIds)) {
      const species = await Specie.findAll({ where: { id: req.body.specieIds } });
      await character.setSpecies(species);
    }

    // 🔗 Lieux
    if (req.body.placeIds && Array.isArray(req.body.placeIds)) {
      const places = await Place.findAll({ where: { id: req.body.placeIds } });
      await character.setPlaces(places);
    }

    // 🔗 Relations entre personnages
    if (req.body.relations !== undefined) {
      // Supprimer toutes les relations existantes où ce personnage est character1 OU character2
      const deletedCount = await CharacterRelation.destroy({
        where: {
          [Op.or]: [
            { character1_id: character.id },
            { character2_id: character.id },
          ],
        },
      });

      // Filtrer les relations valides (avec characterId et relationType non vides)
      const validRelations = Array.isArray(req.body.relations) 
        ? req.body.relations.filter(rel => 
            rel && 
            rel.characterId && 
            rel.relationType && 
            rel.relationType.trim() !== "" &&
            parseInt(rel.characterId, 10) !== character.id
          )
        : [];

      // Ajouter les nouvelles relations
      if (validRelations.length > 0) {
        for (const relation of validRelations) {
          const relatedCharacter = await Character.findByPk(relation.characterId);
          if (relatedCharacter) {
            // Créer la relation (on a déjà supprimé toutes les relations existantes, donc pas besoin de vérifier)
            await CharacterRelation.create({
              character1_id: character.id,
              character2_id: relation.characterId,
              ...relationFields(relation),
            });
          }
        }
      }
      // Si req.body.relations est un tableau vide ou ne contient que des relations invalides, 
      // toutes les relations ont déjà été supprimées ci-dessus
    }

    // Recharge le personnage avec les relations
    const updatedCharacter = await Character.findByPk(req.params.id, {
      include: defaultIncludes,
    });

    // Normaliser les relations
    const normalizedCharacter = normalizeRelations(updatedCharacter);

    res.json(normalizedCharacter);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
exports.deleteCharacter = async (req, res) => {
  try {
    const character = await Character.findByPk(req.params.id, {
      include: defaultIncludes,
    });
    if (!character)
      return res.status(404).json({ error: "Character not found" });

    // Album photo (lié par entityType/entityId, sans clé étrangère) : lignes et fichiers
    const photos = await EntityPhoto.findAll({ where: { entityType: "character", entityId: character.id } });
    await EntityPhoto.destroy({ where: { entityType: "character", entityId: character.id } });
    await character.destroy(); // relations et appartenances supprimées en cascade

    deleteUpload(character.avatar);
    deleteUpload(character.background);
    deleteUpload(character.themeSound);
    photos.forEach((photo) => deleteUpload(photo.imagePath));

    res.json({ message: "Character deleted", deleted: character });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.uploadAvatar = async (req, res) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({ error: "Aucun fichier envoyé" });
    }

    // Vérifie que le personnage existe
    const character = await Character.findByPk(id);
    if (!character) {
      // Supprimer le fichier uploadé si le personnage n'existe pas
      const filePath = path.join(__dirname, "..", "uploads", "characters", "avatars", req.file.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      return res.status(404).json({ error: "Character not found" });
    }

    // Supprimer l'ancien avatar s'il existe
    if (character.avatar) {
      const oldAvatarPath = path.join(__dirname, "..", character.avatar);
      if (fs.existsSync(oldAvatarPath)) {
        fs.unlinkSync(oldAvatarPath);
      }
    }

    const avatarPath = "/uploads/characters/avatars/" + req.file.filename;

    // Mise à jour du champ avatar
    await character.update({ avatar: avatarPath });

    // Recharger le personnage avec les associations pour retourner les données complètes
    const updatedCharacter = await Character.findByPk(id, {
      include: defaultIncludes,
    });

    // Normaliser les relations
    const normalizedCharacter = normalizeRelations(updatedCharacter);

    res.json({ success: true, avatar: avatarPath, character: normalizedCharacter });
  } catch (error) {
    console.error("Erreur upload avatar:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteAvatar = async (req, res) => {
  try {
    const { id } = req.params;

    // Vérifie que le personnage existe
    const character = await Character.findByPk(id);
    if (!character) {
      return res.status(404).json({ error: "Character not found" });
    }

    // Supprimer le fichier avatar s'il existe
    if (character.avatar) {
      const avatarPath = path.join(__dirname, "..", character.avatar);
      if (fs.existsSync(avatarPath)) {
        fs.unlinkSync(avatarPath);
      }
    }

    // Mettre à jour le champ avatar à null
    await character.update({ avatar: null });

    // Recharger le personnage avec les associations
    const updatedCharacter = await Character.findByPk(id, {
      include: defaultIncludes,
    });

    // Normaliser les relations
    const normalizedCharacter = normalizeRelations(updatedCharacter);

    res.json({ success: true, character: normalizedCharacter });
  } catch (error) {
    console.error("Erreur suppression avatar:", error);
    res.status(500).json({ error: error.message });
  }
};
// IMAGE DE FOND (remplace l'ancienne, supprime le fichier précédent)
exports.uploadBackground = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Aucun fichier envoyé" });
    const newPath = "/uploads/characters/backgrounds/" + req.file.filename;
    const character = await Character.findByPk(req.params.id);
    if (!character) {
      deleteUpload(newPath);
      return res.status(404).json({ error: "Character not found" });
    }
    const oldPath = character.background;
    await character.update({ background: newPath });
    if (oldPath) deleteUpload(oldPath);
    const updated = await Character.findByPk(character.id, { include: defaultIncludes });
    res.json(normalizeRelations(updated));
  } catch (error) {
    console.error("Erreur upload fond:", error);
    res.status(500).json({ error: error.message });
  }
};

exports.deleteBackground = async (req, res) => {
  try {
    const character = await Character.findByPk(req.params.id);
    if (!character) return res.status(404).json({ error: "Character not found" });
    const oldPath = character.background;
    await character.update({ background: null });
    if (oldPath) deleteUpload(oldPath);
    const updated = await Character.findByPk(character.id, { include: defaultIncludes });
    res.json(normalizeRelations(updated));
  } catch (error) {
    console.error("Erreur suppression fond:", error);
    res.status(500).json({ error: error.message });
  }
};

// THÈME MUSICAL (module « Son ») : remplace l'ancien fichier, ou le retire
const sounds = imageHandlers({
  Model: Character,
  folders: { themeSound: "characters/sounds" },
  loadDetail: async (id) => normalizeRelations(await Character.findByPk(id, { include: defaultIncludes })),
  notFound: "Character not found",
});
exports.uploadThemeSound = sounds.upload("themeSound");
exports.deleteThemeSound = sounds.remove("themeSound");
