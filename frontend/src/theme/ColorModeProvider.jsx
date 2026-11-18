import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useMemo, useState } from 'react';

/**
 * Deux préférences indépendantes :
 *   - `app`      : Codex (accueil, connexion, utilisateurs, création d'univers) ;
 *   - `universe` : les pages d'un univers (commune à tous les univers).
 * La portée active est choisie par la page affichée (voir useColorModeScope).
 * Les clés sont aussi lues par le script anti-flash de index.html.
 */
const STORAGE_KEYS = {
  app: 'codex:color-mode',
  universe: 'codex:color-mode:universe',
};
const VALUES = ['light', 'dark', 'system'];
const ColorModeContext = createContext(null);

const read = (key) => {
  try {
    const value = localStorage.getItem(key);
    return VALUES.includes(value) ? value : null;
  } catch {
    return null;
  }
};

const readStored = () => {
  const app = read(STORAGE_KEYS.app) ?? 'system';
  // Sans réglage propre, les univers reprennent celui de Codex
  return { app, universe: read(STORAGE_KEYS.universe) ?? app };
};

const systemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/** Préférences clair / sombre / système ; le mode de la portée active est appliqué sur <html data-mode="...">. */
export function ColorModeProvider({ children }) {
  const [preferences, setPreferences] = useState(readStored);
  const [scope, setScope] = useState('app');
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setSystemDark(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolve = useCallback((pref) => (pref === 'system' ? (systemDark ? 'dark' : 'light') : pref), [systemDark]);
  const mode = resolve(preferences[scope]);

  // Avant la peinture : pas de flash en entrant / sortant d'un univers
  useLayoutEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  const setPreference = useCallback((value, target) => {
    setPreferences((prev) => ({ ...prev, [target]: value }));
    try {
      localStorage.setItem(STORAGE_KEYS[target], value);
    } catch {
      /* stockage indisponible : la préférence ne sera pas mémorisée */
    }
  }, []);

  const value = useMemo(
    () => ({ scope, setScope, preferences, mode, resolve, setPreference }),
    [scope, preferences, mode, resolve, setPreference],
  );
  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}

/**
 * Préférence d'une portée (par défaut : la portée active).
 * Retourne { preference, mode, setPreference }.
 */
export const useColorMode = (target) => {
  const ctx = useContext(ColorModeContext);
  const s = target ?? ctx.scope;
  const preference = ctx.preferences[s];
  const setPreference = useCallback((value) => ctx.setPreference(value, s), [ctx, s]);
  return { scope: s, preference, mode: ctx.resolve(preference), setPreference };
};

/** Active une portée tant que le composant appelant est monté (ex. UniverseLayout → 'universe'). */
export const useColorModeScope = (target) => {
  const { setScope } = useContext(ColorModeContext);
  useLayoutEffect(() => {
    setScope(target);
    return () => setScope('app');
  }, [target, setScope]);
};
