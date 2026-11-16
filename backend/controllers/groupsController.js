const { Op } = require("sequelize");
const Group = require('../models/Group');
const Character = require("../models/Character");
const GroupType = require("../models/GroupType");
const CharacterGroup = require("../models/CharacterGroup");
const Place = require("../models/Place");
const GroupPlace = require("../models/GroupPlace");
const EntityPhoto = require("../models/EntityPhoto");
const { deleteUpload } = require("../services/universeTransfer");
const { cleanColors, isHexColor } = require("../utils/colors");
const { imageHandlers } = require("../utils/entityImages");

const { DEFAULT_ROLES, groupRoles, cleanRoles, fallbackRole } = require("../utils/groupRoles");
const IMAGE_FIELDS = { image: "images", banner: "banners", background: "backgrounds" };

// Personnages renvoyés avec un groupe (avatar, titre et couleurs pour l'affichage)
const MEMBER_ATTRIBUTES = ["id", "firstname", "name", "title", "avatar", "colors"];
const SUBGROUP_ATTRIBUTES = ["id", "name", "image", "colors", "groupTypeId"];

const listIncludes = [
  { model: GroupType, as: "type", attributes: ["id", "name"] },
  { model: Group, as: "parent", attributes: ["id", "name", "image", "colors"] },
  { model: Group, as: "children", attributes: ["id"] },
  { model: Character, as: "characters", attributes: MEMBER_ATTRIBUTES, through: { attributes: ["role"] } },
  { model: Place, as: "controlledPlaces", attributes: ["id", "name"] },
];

const detailIncludes = [
  { model: GroupType, as: "type", attributes: ["id", "name"] },
  { model: Group, as: "parent", attributes: SUBGROUP_ATTRIBUTES },
  {
    model: Group,
    as: "children",
    attributes: SUBGROUP_ATTRIBUTES,
    include: [{ model: Character, as: "characters", attributes: ["id"], through: { attributes: [] } }],
  },
  { model: Character, as: "characters", attributes: MEMBER_ATTRIBUTES, through: { attributes: ["role"] } },
  { model: Place, as: "controlledPlaces", attributes: ["id", "name"] },
];

const toId = (v) => (v === "" || v == null ? null : parseInt(v, 10) || null);

/** Champs modifiables d'un groupe (les images passent par leurs routes dédiées). */
function pickGroupFields(body) {
  const data = {};
  if (body.name !== undefined) data.name = typeof body.name === "string" ? body.name.trim() : body.name;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.parentId !== undefined) data.parentId = toId(body.parentId);
  if (body.groupTypeId !== undefined) data.groupTypeId = toId(body.groupTypeId);
  if (body.colors !== undefined) data.colors = cleanColors(body.colors);
  if (body.roles !== undefined) data.roles = cleanRoles(body.roles) || DEFAULT_ROLES;
  if (body.backgroundColor !== undefined) data.backgroundColor = isHexColor(body.backgroundColor) ? body.backgroundColor.toLowerCase() : null;
  return data;
}

/**
 * Membres envoyés : `characters` [{ characterId, role }] ou `characterIds` [id] (ancien format).
 * Un rôle inconnu du groupe est remplacé par le rôle par défaut. Renvoie null si rien n'est fourni.
 */
function readMembers(body, roles) {
  const keys = new Set(roles.map((r) => r.key));
  const fallback = fallbackRole(roles);
  if (Array.isArray(body.characters)) {
    const seen = new Set();
    return body.characters
      .map((m) => ({ id: toId(m.characterId ?? m.id), role: keys.has(m.role) ? m.role : fallback }))
      .filter((m) => m.id && !seen.has(m.id) && seen.add(m.id));
  }
  if (Array.isArray(body.characterIds)) {
    return [...new Set(body.characterIds.map(toId).filter(Boolean))].map((id) => ({ id, role: fallback }));
  }
  return null;
}

async function saveMembers(group, members) {
  if (members) {
    await CharacterGroup.destroy({ where: { group_id: group.id } });
    if (members.length) {
      await CharacterGroup.bulkCreate(members.map((m) => ({ character_id: m.id, group_id: group.id, role: m.role })));
    }
  }
  // Membres dont le rôle n'existe plus (rôle supprimé) : rôle par défaut
  const roles = groupRoles(group);
  await CharacterGroup.update(
    { role: fallbackRole(roles) },
    { where: { group_id: group.id, role: { [Op.notIn]: roles.map((r) => r.key) } } },
  );
}

/** Groupe complet : membres, sous-groupes, lieux, et ce qui est hérité des sous-groupes. */
async function loadGroupDetail(id) {
  const group = await Group.findByPk(id, { include: detailIncludes });
  if (!group) return null;
  const data = group.toJSON();
  const directIds = new Set((data.characters || []).map((c) => c.id));
  data.indirectlyControlledPlaces = await getIndirectlyControlledPlaces(group.id);
  data.indirectlyRelatedCharacters = (await getIndirectlyRelatedCharacters(group.id)).filter((c) => !directIds.has(c.id));
  return data;
}

/** Vérifie qu'un parent est valide (pas soi-même, pas un descendant). Renvoie un message d'erreur ou null. */
async function checkParent(groupId, parentId) {
  if (parentId == null) return null;
  if (groupId && parentId === Number(groupId)) return "Un groupe ne peut pas être son propre parent";
  if (groupId && (await isDescendant(parentId, Number(groupId)))) return "Un groupe ne peut pas avoir comme parent un de ses descendants";
  if (!(await Group.findByPk(parentId))) return "Groupe parent introuvable";
  return null;
}

// Helper : vérifier si un groupe est descendant d'un autre
async function isDescendant(childId, parentId) {
  if (!childId) return false;
  const child = await Group.findByPk(childId);
  if (!child || !child.parentId) return false;

  if (child.parentId === parentId) return true;

  return await isDescendant(child.parentId, parentId);
}

// Helper : récupérer tous les lieux descendants d'un lieu (récursif)
async function getAllDescendantPlaces(placeId) {
  const children = await Place.findAll({ where: { parentId: placeId } });
  let allDescendants = [...children];
  
  for (const child of children) {
    const grandChildren = await getAllDescendantPlaces(child.id);
    allDescendants = [...allDescendants, ...grandChildren];
  }
  
  return allDescendants;
}

// Helper : récupérer tous les descendants d'un groupe (récursif)
async function getAllDescendantGroups(groupId) {
  const children = await Group.findAll({ where: { parentId: groupId } });
  let allDescendants = [...children];
  
  for (const child of children) {
    const grandChildren = await getAllDescendantGroups(child.id);
    allDescendants = [...allDescendants, ...grandChildren];
  }
  
  return allDescendants;
}

// Helper : calculer les lieux contrôlés indirectement
async function getIndirectlyControlledPlaces(groupId) {
  // Récupérer tous les lieux directement contrôlés
  const group = await Group.findByPk(groupId, {
    include: [
      {
        model: Place,
        as: 'controlledPlaces',
        attributes: ['id', 'name'],
      },
    ],
  });
  
  if (!group || !group.controlledPlaces || group.controlledPlaces.length === 0) {
    return [];
  }
  
  // Pour chaque lieu directement contrôlé, récupérer tous ses descendants
  const indirectPlaces = [];
  for (const place of group.controlledPlaces) {
    const descendants = await getAllDescendantPlaces(place.id);
    indirectPlaces.push(...descendants);
  }
  
  return indirectPlaces;
}

// Helper : récupérer les personnages indirects d'un groupe (via les groupes enfants)
async function getIndirectlyRelatedCharacters(groupId) {
  const indirectCharacters = [];
  const seenIds = new Set();
  
  // Récupérer tous les groupes descendants
  const descendantGroups = await getAllDescendantGroups(groupId);
  
  for (const descendantGroup of descendantGroups) {
    const groupWithChars = await Group.findByPk(descendantGroup.id, {
      include: [
        {
          model: Character,
          as: 'characters',
          attributes: ['id', 'firstname', 'name', 'avatar'],
          through: { attributes: ['role'] },
        },
      ],
    });
    
    if (groupWithChars && groupWithChars.characters) {
      for (const char of groupWithChars.characters) {
        if (!seenIds.has(char.id)) {
          seenIds.add(char.id);
          indirectCharacters.push({
            ...char.toJSON(),
            indirectVia: `Groupe "${descendantGroup.name}" (enfant)`,
          });
        }
      }
    }
  }
  
  return indirectCharacters;
}

// 🔹 Récupérer tous les groupes (filtrés par univers)
exports.getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.universe_id) where.universe_id = req.query.universe_id;
    const groups = await Group.findAll({ where, include: listIncludes, order: [["name", "ASC"]] });
    res.json(groups);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// 🔹 Récupérer un groupe par ID
exports.getById = async (req, res) => {
  try {
    const group = await loadGroupDetail(req.params.id);
    if (!group) return res.status(404).json({ error: "Groupe non trouvé" });
    res.json(group);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Créer un nouveau groupe
exports.create = async (req, res) => {
  try {
    const data = pickGroupFields(req.body);
    if (!data.name) return res.status(400).json({ error: "Le nom du groupe est requis." });
    const parentError = await checkParent(null, data.parentId);
    if (parentError) return res.status(400).json({ error: parentError });

    // Un nouveau groupe reçoit les 5 rôles par défaut s'il n'en précise pas
    const group = await Group.create({ roles: DEFAULT_ROLES, ...data, universe_id: toId(req.body.universe_id) });
    await saveMembers(group, readMembers(req.body, groupRoles(group)));
    if (Array.isArray(req.body.placeIds)) await group.setControlledPlaces(req.body.placeIds.map(toId).filter(Boolean));

    res.status(201).json(await loadGroupDetail(group.id));
  } catch (error) {
    console.error("Erreur création groupe:", error);
    res.status(500).json({ error: "Erreur lors de la création du groupe" });
  }
};

// 🔹 Mettre à jour un groupe (seuls les champs envoyés sont modifiés)
exports.update = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: "Groupe non trouvé" });

    const data = pickGroupFields(req.body);
    if ("name" in data && !data.name) return res.status(400).json({ error: "Le nom du groupe est requis." });
    if ("parentId" in data) {
      const parentError = await checkParent(group.id, data.parentId);
      if (parentError) return res.status(400).json({ error: parentError });
    }

    await group.update(data);
    await saveMembers(group, readMembers(req.body, groupRoles(group)));
    if (Array.isArray(req.body.placeIds)) await group.setControlledPlaces(req.body.placeIds.map(toId).filter(Boolean));

    res.json(await loadGroupDetail(group.id));
  } catch (error) {
    console.error("Erreur update groupe:", error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Supprimer un groupe (avec ses images et son album)
exports.delete = async (req, res) => {
  try {
    const group = await Group.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: "Groupe non trouvé" });

    // Les sous-groupes remontent au niveau du parent supprimé
    await Group.update({ parentId: group.parentId ?? null }, { where: { parentId: group.id } });

    const photos = await EntityPhoto.findAll({ where: { entityType: "group", entityId: group.id } });
    await EntityPhoto.destroy({ where: { entityType: "group", entityId: group.id } });
    await group.destroy();

    Object.keys(IMAGE_FIELDS).forEach((field) => deleteUpload(group[field]));
    deleteUpload(group.themeSound);
    photos.forEach((photo) => deleteUpload(photo.imagePath));
    res.json({ message: "Groupe supprimé avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Images : logo (image), bannière (banner), fond (background)
const imageFolders = Object.fromEntries(Object.entries(IMAGE_FIELDS).map(([field, dir]) => [field, `groups/${dir}`]));
const images = imageHandlers({ Model: Group, folders: imageFolders, loadDetail: loadGroupDetail, notFound: "Groupe non trouvé" });
exports.uploadImageField = images.upload;
exports.deleteImageField = images.remove;

// Thème musical (module « Son »)
const sounds = imageHandlers({ Model: Group, folders: { themeSound: "groups/sounds" }, loadDetail: loadGroupDetail, notFound: "Groupe non trouvé" });
exports.uploadThemeSound = sounds.upload("themeSound");
exports.deleteThemeSound = sounds.remove("themeSound");

// Anciennes routes (logo)
exports.uploadImage = images.upload("image");
exports.deleteImage = images.remove("image");
