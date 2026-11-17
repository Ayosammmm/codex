const EntityEditor = require("../models/EntityEditor");
const EntityCollection = require("../models/EntityCollection");
const EntityPhoto = require("../models/EntityPhoto");
const { EntityMetadata } = require("../models/Mod");
const Episode = require("../models/Episode");
const Story = require("../models/Story");
const { hasRole, isAdmin, canEditEntity, userFromToken, ENTITY_TYPES } = require("../services/auth");

/**
 * Contrôle d'accès de toute l'API (notes Obsidian « Utilisateurs »), en un seul endroit :
 * - sans compte connecté : seule la connexion est possible ;
 * - lecture (GET) : tout utilisateur connecté (les lecteurs voient tous les univers) ;
 * - univers, référentiels : admins ;
 * - entités : création par les éditeurs (qui y sont alors liés), modification / suppression
 *   par les admins ou les éditeurs liés à l'entité ;
 * - roleplay : éditeurs et admins (personnages joués et auteur vérifiés par le contrôleur) ;
 * - épisodes : selon les droits sur leur histoire ; photos, collections et métadonnées de mods d'une entité :
 *   selon les droits sur l'entité ;
 * - mods : installation / désinstallation par les super admins ; données des pages de mods : éditeurs
 *   (auteur ou admin vérifiés par le contrôleur).
 * Les routes /auth, /users et /editors font leurs propres vérifications.
 */

const ENTITY_RESOURCES = {
  characters: "character",
  places: "place",
  groups: "group",
  species: "specie",
  creatures: "creature",
  stories: "story",
  events: "event",
  "custom-entities": "custom",
};
const ADMIN_RESOURCES = new Set(["universes", "genders", "statuses", "alignments", "power-ranks", "places_type", "groups_type"]);
const SELF_CHECKED = new Set(["auth", "users", "editors"]);
const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

const toId = (v) => (Number.isInteger(Number(v)) && Number(v) > 0 ? Number(v) : null);

/** Lit le jeton (en-tête Authorization: Bearer …) et renseigne req.user. */
async function authenticate(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  req.user = token ? await userFromToken(token) : null;
  next();
}

/**
 * Après une réussite, exécute `after(body)` AVANT d'envoyer la réponse (liens éditeurs à la création,
 * nettoyage à la suppression) : le frontend voit ainsi ses droits à jour dès la réponse reçue.
 */
function afterSuccess(res, after) {
  const original = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400) return original(body);
    Promise.resolve()
      .then(() => after(body))
      .catch((err) => console.error("Liens éditeurs / collections :", err))
      .finally(() => original(body));
    return res;
  };
}

/** L'utilisateur peut-il modifier cet épisode (via l'une de ses histoires) ? */
async function canEditEpisode(user, episodeId) {
  if (isAdmin(user)) return true;
  const episode = await Episode.findByPk(episodeId, { include: [{ model: Story, as: "stories", attributes: ["id"] }] });
  if (!episode) return true; // le contrôleur répondra 404
  for (const story of episode.stories) if (await canEditEntity(user, "story", story.id)) return true;
  return false;
}

async function authorize(req, res, next) {
  try {
    const [resource, id, sub, subId] = req.path.split("/").filter(Boolean);
    const write = !READ_METHODS.has(req.method);

    if (resource === "auth" && req.path === "/auth/login") return next();
    if (!req.user) return res.status(401).json({ error: "Connexion requise." });
    if (!write || SELF_CHECKED.has(resource)) return next();

    const deny = () => res.status(403).json({ error: "Vous n’avez pas les droits pour cette action." });

    if (ADMIN_RESOURCES.has(resource)) return isAdmin(req.user) ? next() : deny();

    // --- Roleplay : éditeurs et admins ; droits fins (personnages joués, auteur) dans le contrôleur ---
    // (marquer un fil comme lu : tout compte connecté, lecteurs compris)
    if (resource === "roleplay") return hasRole(req.user, "editor") || (id === "places" && subId === "read") ? next() : deny();

    // --- Collections : le référentiel est réservé aux admins, les liens d'une entité suivent ses droits ---
    if (resource === "collections") {
      if (id === "links") return ENTITY_TYPES.includes(sub) && (await canEditEntity(req.user, sub, toId(subId))) ? next() : deny();
      return isAdmin(req.user) ? next() : deny();
    }

    // --- Mods : installés par les super admins ; activés par univers dans ses paramètres (admins) ---
    if (resource === "mods") return req.user.role === "superadmin" ? next() : deny();
    if (resource === "mod-records") return hasRole(req.user, "editor") ? next() : deny();
    if (resource === "entity-metadata") {
      return ENTITY_TYPES.includes(id) && (await canEditEntity(req.user, id, toId(sub))) ? next() : deny();
    }

    // --- Entités ---
    const entityType = ENTITY_RESOURCES[resource];
    if (entityType) {
      if (!id || id === "reorder") {
        if (!hasRole(req.user, "editor")) return deny();
        // Création par un éditeur : l'entité lui est liée
        if (!id && req.method === "POST" && !isAdmin(req.user)) {
          afterSuccess(res, (body) => body?.id && EntityEditor.findOrCreate({ where: { entityType, entityId: body.id, userId: req.user.id } }));
        }
        return next();
      }
      if (!(await canEditEntity(req.user, entityType, toId(id)))) return deny();
      // Suppression de l'entité (pas d'une de ses images) : ses liens éditeurs et collections disparaissent
      if (req.method === "DELETE" && !sub) {
        afterSuccess(res, () => Promise.all([
          EntityEditor.destroy({ where: { entityType, entityId: toId(id) } }),
          EntityCollection.destroy({ where: { entityType, entityId: toId(id) } }),
          EntityMetadata.destroy({ where: { entityType, entityId: toId(id) } }),
        ]));
      }
      return next();
    }

    // --- Épisodes : droits de leur histoire ---
    if (resource === "episodes") {
      if (!id) {
        const storyId = toId(req.body?.storyId);
        return (isAdmin(req.user) || (storyId && (await canEditEntity(req.user, "story", storyId)))) ? next() : deny();
      }
      return (await canEditEpisode(req.user, toId(id))) ? next() : deny();
    }

    // --- Photos d'album : droits de leur entité ---
    if (resource === "entity-photos") {
      if (req.method === "POST") {
        return ENTITY_TYPES.includes(id) && (await canEditEntity(req.user, id, toId(sub))) ? next() : deny();
      }
      const photo = await EntityPhoto.findByPk(toId(id));
      if (!photo) return next(); // le contrôleur répondra 404
      return (await canEditEntity(req.user, photo.entityType, photo.entityId)) ? next() : deny();
    }

    // Autres écritures (proxy d'images...) : admins
    return isAdmin(req.user) ? next() : deny();
  } catch (error) {
    next(error);
  }
}

module.exports = { authenticate, authorize };
