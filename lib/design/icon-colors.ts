/**
 * Couleurs des carrés d'icône des cellules (section 5.5), façon Réglages iOS.
 * Chacune garde un contraste d'au moins 3:1 avec l'icône blanche (test de contraste).
 */
export const ICON_COLORS = {
  blue: "#007aff",
  indigo: "#5856d6",
  purple: "#a347d1",
  pink: "#e0244b",
  red: "#e0352b",
  orange: "#c93400",
  green: "#248a3d",
  teal: "#0a7d8c",
  gray: "#7c7c82",
  live: "#e11d48",
  daily: "#b45309",
} as const;

export type IconColor = keyof typeof ICON_COLORS;
