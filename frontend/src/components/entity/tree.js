/**
 * Ids d'un élément et de tous ses descendants (champ `parentId`) : ils ne peuvent pas devenir
 * son parent sans créer une boucle.
 */
export function descendantIds(id, items) {
  const ids = new Set([id]);
  let added = true;
  while (added) {
    added = false;
    for (const item of items) {
      if (item.parentId && ids.has(item.parentId) && !ids.has(item.id)) {
        ids.add(item.id);
        added = true;
      }
    }
  }
  return ids;
}

/** Ancêtres d'un élément (du plus haut au plus proche), d'après la liste complète (champ `parentId`). */
export function entityAncestors(item, items) {
  const byId = new Map(items.map((i) => [i.id, i]));
  const chain = [];
  const seen = new Set([item.id]);
  let current = byId.get(item.parentId);
  while (current && !seen.has(current.id)) {
    chain.unshift(current);
    seen.add(current.id);
    current = byId.get(current.parentId);
  }
  return chain;
}
