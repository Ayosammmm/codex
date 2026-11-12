const HEX = /^#([0-9a-f]{6})$/i;

export const isHexColor = (value) => typeof value === 'string' && HEX.test(value);

const channel = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};

/** Luminance relative WCAG d'une couleur hex (#rrggbb). */
export const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
};

export const contrastRatio = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

/** Couleur de texte (blanc ou quasi-noir) la plus lisible sur un fond donné. */
export const readableTextOn = (hex) => {
  if (!isHexColor(hex)) return '#ffffff';
  return contrastRatio(hex, '#ffffff') >= contrastRatio(hex, '#1d1b18') ? '#ffffff' : '#1d1b18';
};
