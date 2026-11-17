const { randomInt } = require('crypto');

/*
 * Commandes de hasard du roleplay (« /d20 », « /2d6+3 », « /pileface ») : le tirage est fait ici,
 * côté serveur, pour que personne ne puisse choisir son résultat. Le résultat est enregistré avec le message
 * (colonne `roll` de rp_messages) :
 *   { type: 'dice', expr: '2d6+3', count: 2, sides: 6, modifier: 3, rolls: [4, 1], total: 8 }
 *   { type: 'coin', result: 'pile' | 'face' }
 *
 * Commandes de mise en scène (pas de tirage) : elles changent le fond ou l'ambiance du fil à partir du message,
 * quand le lecteur arrive à sa hauteur. Enregistrées dans la colonne `effect` :
 *   /fond          'background'        image jointe = nouveau fond ('background:none' sans image : fond retiré)
 *   /ambiance      'ambience'          son joint = nouvelle ambiance ('ambience:none' sans son : silence)
 *   /fin-fond      'background:reset'  retour au fond du lieu
 *   /fin-ambiance  'ambience:reset'    retour à l'ambiance du lieu
 * La liste affichée dans la saisie est dans frontend/src/components/roleplay/rpCommands.js.
 */

const MAX_DICE = 50;
const MAX_SIDES = 1000;
const MAX_MODIFIER = 1000;

const DICE = /^(\d{0,2})d(\d{1,4})(?:([+-])(\d{1,4}))?$/i;

const EFFECTS = {
  fond: 'background',
  'fin-fond': 'background:reset',
  ambiance: 'ambience',
  'fin-ambiance': 'ambience:reset',
};

const httpError = (status, message) => Object.assign(new Error(message), { status });

function rollDice(expr) {
  const match = DICE.exec(expr);
  if (!match) return null;
  const count = match[1] ? Number(match[1]) : 1;
  const sides = Number(match[2]);
  const modifier = match[3] ? Number(`${match[3]}${match[4]}`) : 0;
  if (count < 1 || count > MAX_DICE) throw httpError(400, `Entre 1 et ${MAX_DICE} dés à la fois.`);
  if (sides < 2 || sides > MAX_SIDES) throw httpError(400, `Un dé a entre 2 et ${MAX_SIDES} faces.`);
  if (Math.abs(modifier) > MAX_MODIFIER) throw httpError(400, 'Bonus trop grand.');
  const rolls = Array.from({ length: count }, () => randomInt(1, sides + 1));
  const total = rolls.reduce((a, b) => a + b, 0) + modifier;
  const normalized = `${count > 1 ? count : ''}d${sides}${modifier ? (modifier > 0 ? `+${modifier}` : modifier) : ''}`;
  return { type: 'dice', expr: normalized, count, sides, modifier, rolls, total };
}

/**
 * Exécute une commande (« d20 », « 2d6+1 », « pileface », « fond »...) : { roll } pour un tirage,
 * { effect } pour une mise en scène ; null : pas de commande.
 */
function runCommand(command) {
  if (command === undefined || command === null || command === '') return null;
  const name = String(command).trim().toLowerCase().replace(/^\//, '').replace(/\s+/g, '');
  if (EFFECTS[name]) return { effect: EFFECTS[name] };
  if (name === 'pileface' || name === 'piece') return { roll: { type: 'coin', result: randomInt(2) ? 'pile' : 'face' } };
  const dice = rollDice(name);
  if (dice) return { roll: dice };
  throw httpError(400, `Commande inconnue : /${name}`);
}

module.exports = { runCommand };
