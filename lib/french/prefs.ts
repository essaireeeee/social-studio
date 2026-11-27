import { FrenchPrefsSchema } from "@/types/domain";
import type { FrenchPrefs } from "./types";

/** Règles maison par défaut (Atelier Français > Réglages). */
export const DEFAULT_FRENCH_PREFS: FrenchPrefs = FrenchPrefsSchema.parse({});

export function resolvePrefs(prefs?: Partial<FrenchPrefs>): FrenchPrefs {
  return {
    ...DEFAULT_FRENCH_PREFS,
    ...prefs,
    layers: { ...DEFAULT_FRENCH_PREFS.layers, ...prefs?.layers },
  };
}
