/** Générateur pseudo-aléatoire à graine (mulberry32) : même graine = même suite. */
const seededRandom = (seed) => {
  let a = Math.floor(seed * 2 ** 32) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * `count` éléments tirés au hasard dans `items` (sans doublon).
 * Déterministe pour une graine donnée : le tirage reste stable entre deux rendus.
 */
export const sample = (items = [], count, seed) => {
  const rand = seededRandom(seed);
  const copy = [...items];
  const n = Math.min(count, copy.length);
  // Fisher-Yates partiel : seuls les n premiers éléments sont mélangés
  for (let i = 0; i < n; i++) {
    const j = i + Math.floor(rand() * (copy.length - i));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy.slice(0, n);
};

export const newSeed = () => Math.random();
