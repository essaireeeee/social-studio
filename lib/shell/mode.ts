/**
 * Changement de mode (section 12.2). Les champs communs (combattants, événement) suivent
 * le CM d'un mode à l'autre ; la catégorie revient à la dernière utilisée dans le mode
 * d'arrivée ; les références et le profil de style dépendent du mode et ne passent jamais.
 * Logique pure.
 */
import { FIELDS, getCategory } from "@/lib/categories/registry";
import type { BriefFieldValue, Mode } from "@/types/domain";

/** Champs conservés au changement de mode : tous les champs combattant, et l'événement. */
export const COMMON_FIELD_KEYS: readonly string[] = Object.values(FIELDS)
  .filter((field) => field.type === "fighter" || field.type === "event")
  .map((field) => field.key);

export type BriefFields = Record<string, BriefFieldValue | undefined>;

export interface ModeMemory {
  mode: Mode;
  /** Dernière catégorie utilisée dans chaque mode. */
  categoryByMode: Partial<Record<Mode, string>>;
  /** Champs communs saisis, quel que soit le mode. */
  common: BriefFields;
}

export const MODE_LABELS: Record<Mode, string> = { live: "LIVE SHOW", daily: "DAILY & MEDIA" };

/** Ne garde que les champs communs d'un brief. */
export function commonFields(fields: BriefFields): BriefFields {
  return Object.fromEntries(
    Object.entries(fields).filter(
      ([key, value]) => COMMON_FIELD_KEYS.includes(key) && value !== undefined && value !== "",
    ),
  );
}

/** Mémorise la catégorie courante du mode, et les champs communs du brief en cours. */
export function rememberCategory(
  memory: ModeMemory,
  categoryId: string,
  fields: BriefFields = {},
): ModeMemory {
  const category = getCategory(categoryId);
  if (!category || category.mode !== memory.mode) return memory;
  return {
    ...memory,
    categoryByMode: { ...memory.categoryByMode, [memory.mode]: categoryId },
    common: { ...memory.common, ...commonFields(fields) },
  };
}

/** Passe dans l'autre mode : mêmes champs communs, catégorie de ce mode retrouvée. */
export function switchMode(memory: ModeMemory, next: Mode): ModeMemory {
  if (memory.mode === next) return memory;
  return { ...memory, mode: next };
}

/** Catégorie à rouvrir dans le mode courant, si une a déjà été utilisée. */
export function currentCategory(memory: ModeMemory): string | undefined {
  const id = memory.categoryByMode[memory.mode];
  return id && getCategory(id)?.mode === memory.mode ? id : undefined;
}
