const PRESERVING = /white-space\s*:\s*(pre|pre-wrap|pre-line|break-spaces)\b/i;
const STRUCTURE = 'p, div, br, li, h1, h2, h3, h4, h5, h6, blockquote, tr, pre';

/** Le texte de ce nœud garde-t-il ses sauts de ligne à l'affichage (style `white-space: pre…`) ? */
function keepsLineBreaks(node) {
  for (let el = node.parentElement; el; el = el.parentElement) {
    if (el.tagName === 'PRE' || el.tagName === 'CODE') return false; // déjà géré par l'éditeur
    const style = el.getAttribute('style');
    if (style && PRESERVING.test(style)) return true;
  }
  return false;
}

/**
 * HTML collé dans l'éditeur : beaucoup de sites (messageries, éditeurs en ligne...) affichent
 * les retours à la ligne avec `white-space: pre-wrap` au lieu de balises. ProseMirror lit ce HTML
 * normalement et transforme ces sauts de ligne en espaces : on les convertit en <br>.
 * - Texte avec un style `white-space: pre…` : ses sauts de ligne sont convertis.
 * - HTML sans aucune balise de structure (que du texte et du gras...) : idem, c'est forcément ce cas.
 */
export function transformPastedHTML(html) {
  if (!html.includes('\n')) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const unstructured = !doc.body.querySelector(STRUCTURE);
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const targets = [];
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (/\S/.test(node.data) && /\r?\n/.test(node.data) && (unstructured || keepsLineBreaks(node))) targets.push(node);
  }
  for (const node of targets) {
    const parts = node.data.split(/\r?\n/);
    const fragment = doc.createDocumentFragment();
    parts.forEach((part, i) => {
      if (i > 0) fragment.appendChild(doc.createElement('br'));
      if (part) fragment.appendChild(doc.createTextNode(part));
    });
    node.replaceWith(fragment);
  }
  return doc.body.innerHTML;
}
