const Character = require("../models/Character");
const CharacterForm = require("../models/CharacterForm");
const Place = require("../models/Place");
const Group = require("../models/Group");
const Specie = require("../models/Specie");
const Creature = require("../models/Creature");
const Story = require("../models/Story");
const Event = require("../models/Event");
const { CustomEntity } = require("../models/Mod");

/**
 * Enregistrement des textes riches réécrits par le frontend (liens automatiques vers les entités, voir
 * frontend/src/utils/autoLink.js). Seuls les champs de texte riche listés ici sont modifiables, et seulement
 * pour les fiches de l'univers : le reste de la fiche (membres, liens, images…) n'est pas touché.
 */
const RICH_FIELDS = {
  characters: { model: Character, fields: ["powers", "personality", "story", "extras", "developmentNote"] },
  characterForms: { model: CharacterForm, fields: ["powers", "personality", "story", "extras", "developmentNote"] },
  places: { model: Place, fields: ["description"] },
  groups: { model: Group, fields: ["description"] },
  species: { model: Specie, fields: ["description"] },
  creatures: { model: Creature, fields: ["attackTypes", "moreDetails"] },
  stories: { model: Story, fields: ["description"] },
  events: { model: Event, fields: ["description"] },
  customEntities: { model: CustomEntity, fields: ["description"] },
};

const MAX_UPDATES = 500;

/**
 * `updates` : [{ resource, id, field, html }]. Renvoie le nombre de champs enregistrés.
 * Une mise à jour invalide (ressource, champ ou fiche hors de l'univers) est ignorée.
 */
async function saveRichTexts(universeId, updates) {
  if (!Array.isArray(updates)) return 0;
  let saved = 0;
  for (const u of updates.slice(0, MAX_UPDATES)) {
    const spec = RICH_FIELDS[u?.resource];
    const id = Number(u?.id);
    if (!spec || !Number.isInteger(id) || !spec.fields.includes(u.field) || typeof u.html !== "string") continue;
    const [count] = await spec.model.update({ [u.field]: u.html }, { where: { id, universe_id: universeId } });
    saved += count;
  }
  return saved;
}

module.exports = { RICH_FIELDS, saveRichTexts };
