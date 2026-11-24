/**
 * Préférences (section 16.3) : listes d'options rapides éditables et réordonnables,
 * contrôles des valeurs, logo. Logique pure ; l'enregistrement passe par `saveSettings`.
 */
import { SettingsSchema, type Settings } from "@/types/domain";

export type QuickOptionKey = keyof Settings["quickOptions"];

export const QUICK_OPTION_LABELS: Record<QuickOptionKey, string> = {
  rounds: "Rounds",
  methods: "Méthodes de victoire",
  broadcasters: "Diffuseurs",
};

/** Déplace un élément ; hors limites, la liste est rendue telle quelle. */
export function moveItem<T>(list: readonly T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= list.length || to >= list.length)
    return [...list];
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item!);
  return next;
}

/** Ajoute une option (espaces retirés, doublon ignoré sans tenir compte de la casse). */
export function addOption(list: readonly string[], value: string): string[] {
  const clean = value.trim();
  if (!clean || list.some((v) => v.toLowerCase() === clean.toLowerCase())) return [...list];
  return [...list, clean];
}

const FIELD_MESSAGES: Record<string, string> = {
  igTruncation: "Coupure Instagram : entre 60 et 300 caractères.",
  fbTruncation: "Coupure Facebook : entre 100 et 2 000 caractères.",
  accountName: "Le nom de compte est requis.",
};

/** Contrôle complet des réglages ; messages par champ (premier segment du chemin). */
export function preferencesErrors(settings: Settings): Record<string, string> {
  const parsed = SettingsSchema.safeParse(settings);
  if (parsed.success) return {};
  const errors: Record<string, string> = {};
  for (const issue of parsed.error.issues) {
    const field = String(issue.path[0] ?? "general");
    errors[field] ??= FIELD_MESSAGES[field] ?? "Valeur invalide.";
  }
  return errors;
}

export const LOGO_MAX_BYTES = 512 * 1024;
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp", "image/svg+xml"];

export function logoError(file: { type: string; size: number }): string | undefined {
  if (!LOGO_TYPES.includes(file.type)) return "Format accepté : PNG, JPEG, WebP ou SVG.";
  if (file.size > LOGO_MAX_BYTES) return "Logo trop lourd : 512 Ko au maximum.";
  return undefined;
}
