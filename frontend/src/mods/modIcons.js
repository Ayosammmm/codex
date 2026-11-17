import * as Icons from '@/components/ui/icons';

/**
 * Icône d'un mod, d'un type d'entité ou d'une page, par son nom dans le manifeste (« Sparkles », « Swords »…).
 * Toutes les icônes de components/ui/icons.jsx sont utilisables ; nom inconnu : pièce de puzzle.
 */
export const modIcon = (name) => (name && /^[A-Z][A-Za-z0-9]*$/.test(name) && Icons[name]) || Icons.Puzzle;

/** Noms des icônes disponibles (documentation de la page « Mods »). */
export const MOD_ICON_NAMES = Object.keys(Icons).filter((name) => /^[A-Z]/.test(name)).sort();
