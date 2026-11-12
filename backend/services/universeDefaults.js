const Gender = require("../models/Gender");
const Status = require("../models/Status");
const Alignment = require("../models/Alignment");
const PowerRank = require("../models/PowerRank");
const PlaceType = require("../models/PlaceType");
const GroupType = require("../models/GroupType");

/**
 * Valeurs de départ d'un nouvel univers (notes Obsidian « Univers ») : genres, statuts,
 * alignements, rangs, types de lieux et de groupes. Toutes restent modifiables ensuite.
 * Les listes sont dans l'ordre d'affichage (position).
 */
const DEFAULTS = [
  {
    key: "genders",
    model: Gender,
    items: [
      { name: "Homme", color: "#3b82f6" },
      { name: "Femme", color: "#ec4899" },
      { name: "Non-binaire", color: "#a855f7" },
      { name: "Autre", color: "#9ca3af" },
    ],
  },
  {
    key: "statuses",
    model: Status,
    items: [
      { name: "Vivant", color: "#22c55e" },
      { name: "Disparu", color: "#f59e0b" },
      { name: "Décédé", color: "#ef4444" },
      { name: "Inconnu", color: "#9ca3af" },
    ],
  },
  {
    key: "alignments",
    model: Alignment,
    items: [
      { name: "Loyal bon", color: "#16a34a", description: "Agit avec honneur et compassion, dans le respect des règles." },
      { name: "Neutre bon", color: "#22c55e", description: "Fait le bien sans se soucier particulièrement des lois." },
      { name: "Chaotique bon", color: "#84cc16", description: "Suit sa conscience, quitte à briser les règles." },
      { name: "Loyal neutre", color: "#0ea5e9", description: "Fidèle à un code, une loi ou une tradition avant tout." },
      { name: "Neutre", color: "#94a3b8", description: "Ne penche ni vers le bien ni vers le mal." },
      { name: "Chaotique neutre", color: "#a855f7", description: "Libre et imprévisible, guidé par ses envies." },
      { name: "Loyal mauvais", color: "#b45309", description: "Sert ses intérêts par l'ordre, la hiérarchie ou la tyrannie." },
      { name: "Neutre mauvais", color: "#dc2626", description: "Égoïste, prêt à tout pour arriver à ses fins." },
      { name: "Chaotique mauvais", color: "#7f1d1d", description: "Cruel et destructeur, sans foi ni loi." },
    ],
  },
  {
    key: "powerRanks",
    model: PowerRank,
    items: [
      { name: "S", color: "#eab308", description: "Puissance exceptionnelle, légendaire." },
      { name: "A", color: "#ef4444", description: "Très puissant, redouté de presque tous." },
      { name: "B", color: "#f97316", description: "Combattant aguerri." },
      { name: "C", color: "#3b82f6", description: "Capable de se défendre." },
      { name: "D", color: "#9ca3af", description: "Peu ou pas de capacités de combat." },
    ],
  },
  {
    key: "placeTypes",
    model: PlaceType,
    items: ["Monde", "Continent", "Pays", "Région", "Ville", "Village", "Bâtiment", "Lieu naturel"].map((name) => ({ name })),
  },
  {
    key: "groupTypes",
    model: GroupType,
    items: ["Famille", "Clan", "Guilde", "Organisation", "Armée", "Ordre", "Bande"].map((name) => ({ name })),
  },
];

/** Ajoute les valeurs par défaut à un univers (seulement dans les listes encore vides). */
async function seedUniverseDefaults(universeId, transaction) {
  for (const { model, items } of DEFAULTS) {
    const existing = await model.count({ where: { universe_id: universeId }, transaction });
    if (existing) continue;
    await model.bulkCreate(
      items.map((item, i) => ({ ...item, universe_id: universeId, position: i + 1 })),
      { transaction },
    );
  }
}

module.exports = { DEFAULTS, seedUniverseDefaults };
