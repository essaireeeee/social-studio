/**
 * Thèmes de l'application (section 5.1 de PROMPT_V2.md). Logique pure.
 * `next-themes` lit et écrit le choix dans localStorage, sous `THEME_STORAGE_KEY`.
 * Le choix est propre à chaque appareil, comme le réglage d'apparence d'iOS.
 */
export const THEME_STORAGE_KEY = "hex-theme";

export const THEME_CHOICES = ["light", "dark", "system"] as const;
export type ThemeChoice = (typeof THEME_CHOICES)[number];
export type ResolvedTheme = "light" | "dark";

export const THEME_LABELS: Record<ThemeChoice, string> = {
  light: "Jour",
  dark: "Nuit",
  system: "Automatique",
};

/** Couleur de la barre du navigateur (`<meta name="theme-color">`) : le fond d'écran du thème. */
export const THEME_COLORS: Record<ResolvedTheme, string> = {
  light: "#F2F2F7",
  dark: "#000000",
};

export function isThemeChoice(value: unknown): value is ThemeChoice {
  return typeof value === "string" && (THEME_CHOICES as readonly string[]).includes(value);
}

/** Thème affiché pour un choix donné (`system` suit la préférence du système). */
export function resolveTheme(choice: ThemeChoice, systemPrefersDark: boolean): ResolvedTheme {
  if (choice === "system") return systemPrefersDark ? "dark" : "light";
  return choice;
}

/** Bouton rapide soleil / lune : bascule vers le thème opposé à celui affiché. */
export function toggledTheme(resolved: ResolvedTheme): ResolvedTheme {
  return resolved === "dark" ? "light" : "dark";
}
