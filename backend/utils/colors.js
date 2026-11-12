// Couleurs personnalisées d'une entité (personnage, groupe...) : { primary, secondary, tertiary }
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const COLOR_KEYS = ["primary", "secondary", "tertiary"];

const isHexColor = (value) => typeof value === "string" && HEX_COLOR.test(value);

/** Ne garde que les valeurs hexadécimales ; null si aucune couleur. */
const cleanColors = (colors) => {
  if (!colors || typeof colors !== "object") return null;
  const clean = Object.fromEntries(COLOR_KEYS.map((k) => [k, isHexColor(colors[k]) ? colors[k].toLowerCase() : null]));
  return Object.values(clean).some(Boolean) ? clean : null;
};

/** Colonne JSON lue telle quelle ou depuis une chaîne (MySQL). */
const jsonGetter = (field) =>
  function get() {
    const value = this.getDataValue(field);
    if (typeof value === "string") {
      try { return JSON.parse(value); } catch { return null; }
    }
    return value;
  };

module.exports = { HEX_COLOR, isHexColor, cleanColors, jsonGetter };
