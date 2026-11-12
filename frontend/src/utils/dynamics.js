/**
 * Détection des dynamiques de groupe à partir des relations entre personnages
 * (notes Obsidian « Relations » : trios, quatuors, conflits, triangles amoureux…).
 *
 * Chaque relation devient un lien entre deux personnages, avec un signe :
 *   + : ton positif, ou à défaut archétype amical, amoureux ou familial
 *   − : ton négatif, ou à défaut archétype rivalité ou inimitié
 *   0 : neutre ou inconnu (le lien ne compte pas dans les trios)
 * Les trios suivent la théorie de l'équilibre structural :
 *   + + +  trio soudé            + + −  ami commun déchiré (instable)
 *   + − −  ennemi commun         − − −  conflit à trois
 * S'y ajoutent les triangles amoureux, les bandes soudées (4 personnages ou plus,
 * tous liés positivement), les disciples rivaux et les groupes divisés.
 */

export const DYNAMIC_TYPES = [
  { key: 'triangle', label: 'Triangle amoureux', color: '#ec4899', description: 'Un personnage lié sentimentalement à deux autres, qui ne le sont pas entre eux.' },
  { key: 'band', label: 'Bande soudée', color: '#16a34a', description: 'Au moins quatre personnages tous liés positivement les uns aux autres.' },
  { key: 'trio', label: 'Trio soudé', color: '#22c55e', description: 'Trois personnages tous liés positivement.' },
  { key: 'torn', label: 'Ami commun déchiré', color: '#f59e0b', description: 'Un personnage apprécie deux autres qui s’opposent : un équilibre instable.' },
  { key: 'common-enemy', label: 'Ennemi commun', color: '#8b5cf6', description: 'Deux alliés qui s’opposent tous deux au même personnage.' },
  { key: 'conflict', label: 'Conflit à trois', color: '#dc2626', description: 'Trois personnages qui s’opposent tous entre eux.' },
  { key: 'disciples', label: 'Disciples rivaux', color: '#3b82f6', description: 'Deux personnages liés hiérarchiquement au même troisième, et en opposition entre eux.' },
  { key: 'divided', label: 'Groupe divisé', color: '#b45309', description: 'Des membres d’un même groupe en conflit.' },
];
export const dynamicType = (key) => DYNAMIC_TYPES.find((t) => t.key === key);

const POSITIVE = new Set(['amicale', 'amoureuse', 'familiale']);
const NEGATIVE = new Set(['rivalite', 'inimitie']);
const ROMANTIC_NATURE = /couple|amour|amant|fianc|mari|épou|epou|\bex\b/i;

/** Signe d'une relation : +1, -1 ou 0. */
export function relationSign(link) {
  if (link.tone > 0) return 1;
  if (link.tone < 0) return -1;
  if (link.tone === 0) return 0;
  if (POSITIVE.has(link.category)) return 1;
  if (NEGATIVE.has(link.category)) return -1;
  return 0;
}

const isRomantic = (link) => link.category === 'amoureuse' || (!link.category && ROMANTIC_NATURE.test(link.relation_type || ''));
const isHierarchical = (link) => link.category === 'hierarchique';

const pairKey = (a, b) => (a < b ? `${a}-${b}` : `${b}-${a}`);

/** Graphe des relations : Map(id → Map(voisin → lien)). Une seule relation par paire. */
export function buildRelationGraph(characters) {
  const graph = new Map(characters.map((c) => [c.id, new Map()]));
  for (const c of characters) {
    for (const r of c.relatedCharacters || []) {
      if (!graph.has(r.id) || r.id === c.id || graph.get(c.id).has(r.id)) continue;
      const link = { ...(r.CharacterRelation || {}) };
      link.sign = relationSign(link);
      graph.get(c.id).set(r.id, link);
      graph.get(r.id).set(c.id, link);
    }
  }
  return graph;
}

/** Cliques maximales (Bron–Kerbosch avec pivot) du graphe des liens positifs, de taille ≥ min. */
function positiveCliques(graph, min) {
  const neighbors = (v) => new Set([...graph.get(v)].filter(([, l]) => l.sign > 0).map(([id]) => id));
  const N = new Map([...graph.keys()].map((v) => [v, neighbors(v)]));
  const cliques = [];
  const expand = (R, P, X) => {
    if (!P.size && !X.size) {
      if (R.length >= min) cliques.push(R);
      return;
    }
    const pivot = [...P, ...X].reduce((best, u) => (N.get(u).size > (N.get(best)?.size ?? -1) ? u : best), null);
    for (const v of [...P].filter((v) => !N.get(pivot).has(v))) {
      expand([...R, v], new Set([...P].filter((u) => N.get(v).has(u))), new Set([...X].filter((u) => N.get(v).has(u))));
      P.delete(v);
      X.add(v);
    }
  };
  expand([], new Set([...N.keys()].filter((v) => N.get(v).size)), new Set());
  return cliques;
}

/**
 * Détecte les dynamiques. `groups` (facultatif) : groupes avec leurs membres (characters[].id).
 * Renvoie [{ key, type, members: [ids], focus?: id, links: [{ a, b, link }] }].
 */
export function detectDynamics(characters, groups = []) {
  const graph = buildRelationGraph(characters);
  const link = (a, b) => graph.get(a)?.get(b);
  const linksOf = (ids) => {
    const out = [];
    for (let i = 0; i < ids.length; i++) for (let j = i + 1; j < ids.length; j++) if (link(ids[i], ids[j])) out.push({ a: ids[i], b: ids[j], link: link(ids[i], ids[j]) });
    return out;
  };
  const found = [];
  const add = (type, members, focus) => found.push({ key: `${type}:${focus ?? ''}:${[...members].sort((x, y) => x - y).join('-')}`, type, members, focus, links: linksOf(members) });

  // Bandes soudées (4+), puis trios soudés qui n'en font pas déjà partie
  const bands = positiveCliques(graph, 4).sort((x, y) => y.length - x.length);
  bands.forEach((ids) => add('band', ids));
  const inBand = (ids) => bands.some((b) => ids.every((id) => b.includes(id)));

  // Trios : chaque triangle de liens non neutres, une seule fois
  const ids = [...graph.keys()].sort((a, b) => a - b);
  for (const a of ids) {
    for (const b of [...graph.get(a).keys()].filter((x) => x > a)) {
      for (const c of [...graph.get(b).keys()].filter((x) => x > b && graph.get(a).has(x))) {
        const signs = [link(a, b).sign, link(b, c).sign, link(a, c).sign];
        if (signs.includes(0)) continue;
        const negatives = signs.filter((s) => s < 0).length;
        if (negatives === 0) {
          if (!inBand([a, b, c])) add('trio', [a, b, c]);
        } else if (negatives === 3) {
          add('conflict', [a, b, c]);
        } else {
          // Le personnage « pivot » : celui dont les deux liens ont le même signe
          const pivot = [a, b, c].find((x) => {
            const [y, z] = [a, b, c].filter((v) => v !== x);
            return link(x, y).sign === link(x, z).sign;
          });
          add(negatives === 1 ? 'torn' : 'common-enemy', [a, b, c], pivot);
        }
      }
    }
  }

  // Triangles amoureux et disciples rivaux : autour d'un personnage pivot
  for (const x of ids) {
    const romantic = [...graph.get(x)].filter(([, l]) => isRomantic(l)).map(([id]) => id);
    for (let i = 0; i < romantic.length; i++) {
      for (let j = i + 1; j < romantic.length; j++) {
        const [a, b] = [romantic[i], romantic[j]];
        if (!link(a, b) || !isRomantic(link(a, b))) add('triangle', [x, a, b], x);
      }
    }
    const hierarchical = [...graph.get(x)].filter(([, l]) => isHierarchical(l)).map(([id]) => id);
    for (let i = 0; i < hierarchical.length; i++) {
      for (let j = i + 1; j < hierarchical.length; j++) {
        const [a, b] = [hierarchical[i], hierarchical[j]];
        if (link(a, b)?.sign < 0) add('disciples', [x, a, b], x);
      }
    }
  }

  // Groupes divisés : relations négatives entre membres d'un même groupe
  for (const g of groups) {
    const members = (g.characters || []).map((c) => c.id).filter((id) => graph.has(id));
    const hostile = linksOf(members).filter((l) => l.link.sign < 0);
    if (hostile.length) {
      const involved = [...new Set(hostile.flatMap((l) => [l.a, l.b]))];
      found.push({ key: `divided:${g.id}`, type: 'divided', members: involved, group: g, links: hostile });
    }
  }

  const order = DYNAMIC_TYPES.map((t) => t.key);
  return found.sort((x, y) => order.indexOf(x.type) - order.indexOf(y.type) || y.members.length - x.members.length);
}

export { pairKey };
