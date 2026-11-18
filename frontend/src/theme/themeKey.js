import { createContext, useContext } from 'react';

/** Clé du thème de l'univers affiché (codex, sketch, terminal, medieval). */
export const ThemeKeyContext = createContext('codex');
export const useThemeKey = () => useContext(ThemeKeyContext);
