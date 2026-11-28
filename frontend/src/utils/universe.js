/** Segment d'URL d'un univers : « 12-mon-univers ». L'id fait foi, le nom n'est là que pour la lisibilité. */
export const slugify = (text = '') =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

export const universeRef = (universe) => [universe.id, slugify(universe.name)].filter(Boolean).join('-');
export const universePath = (universe, sub = '') => `/univers/${universeRef(universe)}${sub ? `/${sub}` : ''}`;
export const parseUniverseRef = (ref) => {
  const id = Number.parseInt(ref, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
};

/** Texte brut (les descriptions peuvent contenir du HTML venant de l'éditeur riche). Spoilers masqués (« ▒▒▒ »). */
export const plainText = (html = '') => {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  for (const spoiler of doc.querySelectorAll('[data-spoiler]')) spoiler.textContent = '▒▒▒';
  return doc.body.textContent?.replace(/\s+/g, ' ').trim() || '';
};

export const initials = (name = '') =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || '?';

export const plural = (count, singular, pluralForm = `${singular}s`) => `${count} ${count > 1 ? pluralForm : singular}`;
