/**
 * Changement de mode (section 12.2). Les champs communs (combattants, événement) suivent
 * le CM d'un mode à l'autre (`carryCommon`, lib/studio/draft.ts) ; la catégorie revient à la
 * dernière utilisée dans le mode d'arrivée (brouillon par mode) ; les références et le
 * profil de style dépendent du mode et ne passent jamais. Logique pure.
 */
import { FIELDS } from "@/lib/categories/registry";
import type { BriefFieldValue, Mode } from "@/types/domain";

/** Champs conservés au changement de mode : tous les champs combattant, et l'événement. */
export const COMMON_FIELD_KEYS: readonly string[] = Object.values(FIELDS)
  .filter((field) => field.type === "fighter" || field.type === "event")
  .map((field) => field.key);

export type BriefFields = Record<string, BriefFieldValue | undefined>;

export const MODE_LABELS: Record<Mode, string> = { live: "LIVE SHOW", daily: "DAILY & MEDIA" };

/** Ne garde que les champs communs d'un brief. */
export function commonFields(fields: BriefFields): BriefFields {
  return Object.fromEntries(
    Object.entries(fields).filter(
      ([key, value]) => COMMON_FIELD_KEYS.includes(key) && value !== undefined && value !== "",
    ),
  );
}
