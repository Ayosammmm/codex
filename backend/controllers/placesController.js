const Place = require('../models/Place');
const Character = require("../models/Character");
const PlaceType = require('../models/PlaceType');
const Group = require("../models/Group");
const GroupPlace = require("../models/GroupPlace");
const EntityPhoto = require("../models/EntityPhoto");
const { deleteUpload } = require("../services/universeTransfer");
const { cleanColors, isHexColor } = require("../utils/colors");
const { imageHandlers } = require("../utils/entityImages");

const IMAGE_FOLDERS = { banner: "places/banners", background: "places/backgrounds", mapImage: "places/maps" };
const CHARACTER_ATTRIBUTES = ["id", "firstname", "name", "title", "avatar", "colors"];
const GROUP_ATTRIBUTES = ["id", "name", "image", "colors"];
const PLACE_CARD_ATTRIBUTES = ["id", "name", "banner", "background", "colors", "placeTypeId", "parentId", "mapImage", "mapX", "mapY"];

const listIncludes = [
  { model: Place, as: "parent", attributes: ["id", "name"] },
  { model: PlaceType, as: "type", attributes: ["id", "name"] },
  { model: Place, as: "children", attributes: ["id"] },
  { model: Character, as: "characters", attributes: CHARACTER_ATTRIBUTES, through: { attributes: [] } },
  { model: Group, as: "controllingGroups", attributes: GROUP_ATTRIBUTES, through: { attributes: [] } },
];

const detailIncludes = [
  { model: Place, as: "parent", attributes: ["id", "name"] },
  { model: PlaceType, as: "type", attributes: ["id", "name"] },
  { model: Place, as: "children", attributes: PLACE_CARD_ATTRIBUTES },
  { model: Character, as: "characters", attributes: CHARACTER_ATTRIBUTES, through: { attributes: [] } },
  { model: Group, as: "controllingGroups", attributes: GROUP_ATTRIBUTES, through: { attributes: [] } },
];

const toId = (v) => (v === "" || v == null ? null : parseInt(v, 10) || null);
const toIds = (list) => [...new Set(list.map(toId).filter(Boolean))];

/** Champs modifiables d'un lieu (les images passent par leurs routes dédiées). */
function pickPlaceFields(body) {
  const data = {};
  if (body.name !== undefined) data.name = typeof body.name === "string" ? body.name.trim() : body.name;
  if (body.description !== undefined) data.description = body.description || null;
  if (body.parentId !== undefined) data.parentId = toId(body.parentId);
  if (body.placeTypeId !== undefined) data.placeTypeId = toId(body.placeTypeId);
  if (body.colors !== undefined) data.colors = cleanColors(body.colors);
  if (body.backgroundColor !== undefined) data.backgroundColor = isHexColor(body.backgroundColor) ? body.backgroundColor.toLowerCase() : null;
  // Position sur la carte du parent : les deux coordonnées ensemble, en % (0 à 100), ou null pour retirer
  if (body.mapX !== undefined || body.mapY !== undefined) {
    const coord = (v) => (v === null || v === "" || !Number.isFinite(Number(v)) ? null : Math.min(100, Math.max(0, Number(v))));
    const [x, y] = [coord(body.mapX), coord(body.mapY)];
    [data.mapX, data.mapY] = x === null || y === null ? [null, null] : [x, y];
  }
  return data;
}

/** Personnages originaires et groupes contrôlants : modifiés seulement s'ils sont envoyés. */
async function saveLinks(place, body) {
  if (Array.isArray(body.characterIds)) await place.setCharacters(toIds(body.characterIds));
  if (Array.isArray(body.controllingGroupIds)) await place.setControllingGroups(toIds(body.controllingGroupIds));
}

/** Vérifie qu'un parent est valide (pas soi-même, pas un descendant). Renvoie un message d'erreur ou null. */
async function checkParent(placeId, parentId) {
  if (parentId == null) return null;
  if (placeId && parentId === Number(placeId)) return "Un lieu ne peut pas être son propre parent";
  if (placeId && (await isDescendant(parentId, Number(placeId)))) return "Un lieu ne peut pas avoir comme parent un de ses sous-lieux";
  if (!(await Place.findByPk(parentId))) return "Lieu parent introuvable";
  return null;
}

/** Lieu complet : sous-lieux, originaires, groupes (directs et via les lieux parents). */
async function loadPlaceDetail(id) {
  const place = await Place.findByPk(id, { include: detailIncludes });
  if (!place) return null;
  const data = place.toJSON();
  const directGroupIds = new Set((data.controllingGroups || []).map((g) => g.id));
  data.directlyControllingGroups = data.controllingGroups || [];
  data.indirectlyControllingGroups = (await getIndirectlyControllingGroups(place.id))
    .map((g) => (g.toJSON ? g.toJSON() : g))
    .filter((g) => !directGroupIds.has(g.id));
  const directCharIds = new Set((data.characters || []).map((c) => c.id));
  data.indirectlyRelatedCharacters = (await getIndirectlyRelatedCharacters(place.id)).filter((c) => !directCharIds.has(c.id));
  return data;
}

// Helper : vérifier si un lieu est descendant d'un autre
async function isDescendant(childId, parentId) {
  if (!childId) return false;
  const child = await Place.findByPk(childId);
  if (!child || !child.parentId) return false;

  if (child.parentId === parentId) return true;

  return await isDescendant(child.parentId, parentId);
}

// Helper : récupérer tous les ancêtres d'un lieu (récursif)
async function getAllAncestors(placeId) {
  const place = await Place.findByPk(placeId);
  if (!place || !place.parentId) return [];
  
  const parent = await Place.findByPk(place.parentId);
  if (!parent) return [];
  
  const ancestors = [parent];
  const parentAncestors = await getAllAncestors(parent.id);
  return [...ancestors, ...parentAncestors];
}

// Helper : calculer les groupes contrôlants indirectement (via les lieux parents)
async function getIndirectlyControllingGroups(placeId) {
  const ancestors = await getAllAncestors(placeId);
  if (ancestors.length === 0) return [];
  
  // Récupérer tous les groupes qui contrôlent les ancêtres
  const indirectGroups = [];
  for (const ancestor of ancestors) {
    const ancestorWithGroups = await Place.findByPk(ancestor.id, {
      include: [
        {
          model: Group,
          as: 'controllingGroups',
          attributes: ['id', 'name'],
        },
      ],
    });
    if (ancestorWithGroups && ancestorWithGroups.controllingGroups) {
      indirectGroups.push(...ancestorWithGroups.controllingGroups);
    }
  }
  
  // Supprimer les doublons
  const uniqueGroups = [];
  const seenIds = new Set();
  for (const group of indirectGroups) {
    if (!seenIds.has(group.id)) {
      seenIds.add(group.id);
      uniqueGroups.push(group);
    }
  }
  
  return uniqueGroups;
}

// Helper : récupérer tous les descendants d'un lieu (récursif)
async function getAllDescendantPlaces(placeId) {
  const children = await Place.findAll({ where: { parentId: placeId } });
  let allDescendants = [...children];
  
  for (const child of children) {
    const grandChildren = await getAllDescendantPlaces(child.id);
    allDescendants = [...allDescendants, ...grandChildren];
  }
  
  return allDescendants;
}

// Helper : récupérer les personnages indirects d'un lieu
// (via les groupes qui contrôlent le lieu, ou via les lieux parents)
async function getIndirectlyRelatedCharacters(placeId) {
  const Character = require('../models/Character');
  const Group = require('../models/Group');
  const CharacterGroup = require('../models/CharacterGroup');
  
  const indirectCharacters = [];
  const seenIds = new Set();
  
  // 1. Personnages via les groupes qui contrôlent le lieu
  const place = await Place.findByPk(placeId, {
    include: [
      {
        model: Group,
        as: 'controllingGroups',
        attributes: ['id', 'name'],
        include: [
          {
            model: Character,
            as: 'characters',
            attributes: ['id', 'firstname', 'name', 'avatar'],
            through: { attributes: ['role'] },
          },
        ],
      },
    ],
  });
  
  if (place && place.controllingGroups) {
    for (const group of place.controllingGroups) {
      if (group.characters) {
        for (const char of group.characters) {
          if (!seenIds.has(char.id)) {
            seenIds.add(char.id);
            indirectCharacters.push({
              ...char.toJSON(),
              indirectVia: `Groupe "${group.name}"`,
            });
          }
        }
      }
    }
  }
  
  // 2. Personnages via les groupes qui contrôlent les lieux parents
  const indirectGroups = await getIndirectlyControllingGroups(placeId);
  for (const group of indirectGroups) {
    const groupWithChars = await Group.findByPk(group.id, {
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
            indirectVia: `Groupe "${group.name}" (via lieu parent)`,
          });
        }
      }
    }
  }
  
  // 3. Personnages via les lieux parents
  const ancestors = await getAllAncestors(placeId);
  for (const ancestor of ancestors) {
    const ancestorWithChars = await Place.findByPk(ancestor.id, {
      include: [
        {
          model: Character,
          as: 'characters',
          attributes: ['id', 'firstname', 'name', 'avatar'],
          through: { attributes: [] },
        },
      ],
    });
    if (ancestorWithChars && ancestorWithChars.characters) {
      for (const char of ancestorWithChars.characters) {
        if (!seenIds.has(char.id)) {
          seenIds.add(char.id);
          indirectCharacters.push({
            ...char.toJSON(),
            indirectVia: `Lieu "${ancestor.name}" (parent)`,
          });
        }
      }
    }
  }
  
  return indirectCharacters;
}

// 🔹 Récupérer tous les lieux (filtrés par univers)
exports.getAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.universe_id) where.universe_id = req.query.universe_id;
    const places = await Place.findAll({ where, include: listIncludes, order: [["name", "ASC"]] });
    res.json(places);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Récupérer un lieu par ID
exports.getById = async (req, res) => {
  try {
    const place = await loadPlaceDetail(req.params.id);
    if (!place) return res.status(404).json({ error: "Lieu non trouvé" });
    res.json(place);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Créer un lieu
exports.create = async (req, res) => {
  try {
    const data = pickPlaceFields(req.body);
    if (!data.name) return res.status(400).json({ error: "Le nom du lieu est requis." });
    const parentError = await checkParent(null, data.parentId);
    if (parentError) return res.status(400).json({ error: parentError });

    const place = await Place.create({ ...data, universe_id: toId(req.body.universe_id) });
    await saveLinks(place, req.body);
    res.status(201).json(await loadPlaceDetail(place.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Mettre à jour un lieu (seuls les champs envoyés sont modifiés)
exports.update = async (req, res) => {
  try {
    const place = await Place.findByPk(req.params.id);
    if (!place) return res.status(404).json({ error: "Lieu non trouvé" });

    const data = pickPlaceFields(req.body);
    if ("name" in data && !data.name) return res.status(400).json({ error: "Le nom du lieu est requis." });
    if ("parentId" in data) {
      const parentError = await checkParent(place.id, data.parentId);
      if (parentError) return res.status(400).json({ error: parentError });
    }

    await place.update(data);
    await saveLinks(place, req.body);
    res.json(await loadPlaceDetail(place.id));
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Supprimer un lieu (avec ses images et son album) ; ses sous-lieux remontent au niveau du parent
exports.delete = async (req, res) => {
  try {
    const place = await Place.findByPk(req.params.id);
    if (!place) return res.status(404).json({ error: "Lieu non trouvé" });

    await Place.update({ parentId: place.parentId ?? null }, { where: { parentId: place.id } });
    const photos = await EntityPhoto.findAll({ where: { entityType: "place", entityId: place.id } });
    await EntityPhoto.destroy({ where: { entityType: "place", entityId: place.id } });
    await place.destroy();

    Object.keys(IMAGE_FOLDERS).forEach((field) => deleteUpload(place[field]));
    photos.forEach((photo) => deleteUpload(photo.imagePath));
    res.json({ message: "Lieu supprimé avec succès" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

// 🔹 Images : bannière et fond
const images = imageHandlers({ Model: Place, folders: IMAGE_FOLDERS, loadDetail: loadPlaceDetail, notFound: "Lieu non trouvé" });
exports.uploadImageField = images.upload;
exports.deleteImageField = images.remove;
exports.uploadBackground = images.upload("background");
exports.deleteBackground = images.remove("background");
