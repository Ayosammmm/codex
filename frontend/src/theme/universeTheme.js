import { getTheme } from './themes';
import { isHexColor, readableTextOn } from './color';
import { uploadUrl } from '@/api/client';

/** Couleurs effectives d'un univers : couleurs personnalisées, sinon celles du thème. */
export const resolveColors = (universe) => {
  const theme = getTheme(universe?.theme);
  const custom = universe?.colors || {};
  return Object.fromEntries(
    Object.entries(theme.colors).map(([role, fallback]) => [role, isHexColor(custom[role]) ? custom[role] : fallback]),
  );
};

/**
 * Attributs à poser sur l'élément racine d'un univers :
 *   <div {...universeThemeProps(universe)}>
 * Les enfants héritent du thème et des couleurs (voir src/styles/index.css).
 * `overrides` : couleurs qui remplacent celles de l'univers (ex. couleurs d'un personnage).
 */
export const universeThemeProps = (universe, overrides) => {
  const theme = getTheme(universe?.theme);
  const colors = resolveColors(universe);
  for (const role of Object.keys(colors)) {
    if (isHexColor(overrides?.[role])) colors[role] = overrides[role];
  }
  return {
    'data-theme': theme.key,
    style: {
      '--primary': colors.primary,
      '--secondary': colors.secondary,
      '--tertiary': colors.tertiary,
      '--primary-fg': readableTextOn(colors.primary),
      '--secondary-fg': readableTextOn(colors.secondary),
      '--tertiary-fg': readableTextOn(colors.tertiary),
    },
  };
};

/** Style CSS du fond d'ambiance d'un univers (image > couleur > rien). */
export const universeBackdropStyle = (universe, overrides = {}) => {
  const image = overrides.backgroundImage ?? uploadUrl(universe?.background);
  const color = overrides.backgroundColor ?? universe?.backgroundColor;
  if (image) return { backgroundImage: `url("${image}")`, backgroundSize: 'cover', backgroundPosition: 'center' };
  if (isHexColor(color)) return { backgroundColor: color };
  return null;
};

/**
 * Variables CSS aux couleurs d'une entité (personnage, groupe) : --entity-primary, --entity-secondary, --entity-tertiary.
 * Une couleur non définie vaut `initial` : les styles utilisent alors leur repli neutre
 * (aucune couleur), et la valeur d'un parent (fiche) n'est pas héritée.
 */
export const entityColorVars = (colors) =>
  Object.fromEntries(
    ['primary', 'secondary', 'tertiary'].map((role) => [`--entity-${role}`, isHexColor(colors?.[role]) ? colors[role] : 'initial']),
  );
