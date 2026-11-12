import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const STORAGE_KEY = 'almanach:color-mode';
const ColorModeContext = createContext(null);

const readStored = () => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return ['light', 'dark', 'system'].includes(value) ? value : 'system';
  } catch {
    return 'system';
  }
};

const systemPrefersDark = () => window.matchMedia('(prefers-color-scheme: dark)').matches;

/** Préférence clair / sombre / système, appliquée sur <html data-mode="...">. */
export function ColorModeProvider({ children }) {
  const [preference, setPreference] = useState(readStored);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  useEffect(() => {
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (e) => setSystemDark(e.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const mode = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference;

  useEffect(() => {
    document.documentElement.dataset.mode = mode;
  }, [mode]);

  const changePreference = useCallback((value) => {
    setPreference(value);
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      /* stockage indisponible : la préférence ne sera pas mémorisée */
    }
  }, []);

  const value = useMemo(() => ({ preference, mode, setPreference: changePreference }), [preference, mode, changePreference]);
  return <ColorModeContext.Provider value={value}>{children}</ColorModeContext.Provider>;
}

export const useColorMode = () => useContext(ColorModeContext);
