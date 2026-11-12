import { createContext, useContext } from 'react';

/** Clé du thème de l'univers affiché (almanach, sketch, terminal, medieval). */
export const ThemeKeyContext = createContext('almanach');
export const useThemeKey = () => useContext(ThemeKeyContext);
