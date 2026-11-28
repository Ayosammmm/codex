import { useEffect } from 'react';

/**
 * Titre de l'onglet, du plus précis au plus général : « Modifier · Lucas · Personnages · Mon univers · Codex ».
 *
 * Chaque composant fournit sa partie avec un niveau ; les parties encore affichées sont triées par niveau
 * (le plus précis en premier). Indépendant de l'ordre de montage : le cadre de l'univers et la page
 * peuvent poser leur partie dans n'importe quel ordre. À même niveau, la dernière posée l'emporte.
 */

const APP_NAME = 'Codex';

export const TITLE_LEVEL = { page: 0, universe: 1, section: 2, detail: 3, action: 4 };

const entries = [];

function render() {
  const byLevel = new Map();
  for (const e of entries) byLevel.set(e.level, e.text);
  const parts = [...byLevel.entries()].sort((a, b) => b[0] - a[0]).map(([, text]) => text);
  // Parties identiques côte à côte (ex. section et page de mod du même nom) : une seule fois
  document.title = [...parts, APP_NAME].filter((p, i, all) => p !== all[i - 1]).join(' · ');
}

/** Pose `text` dans le titre de l'onglet tant que le composant est affiché (rien si `text` est vide). */
export function usePageTitle(text, level = TITLE_LEVEL.detail) {
  useEffect(() => {
    if (!text) return undefined;
    const entry = { level, text };
    entries.push(entry);
    render();
    return () => {
      entries.splice(entries.indexOf(entry), 1);
      render();
    };
  }, [text, level]);
}
