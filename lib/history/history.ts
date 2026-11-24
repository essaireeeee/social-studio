/**
 * Historique des générations (section 16.1) et apprentissage contrôlé : rien n'entre
 * dans le corpus de style sans action explicite du CM. Logique pure.
 */
import type { Generation, Mode, Variant } from "@/types/domain";

export type GenerationStatus = Generation["status"];

/** Les quatre statuts, jamais confondus (section 16.1). */
export const GENERATION_STATUS_LABELS: Record<GenerationStatus, string> = {
  draft: "Brouillon",
  editing: "En cours de modification",
  validated: "Validé",
  published: "Publié",
};

export const ENGINE_LABELS: Record<Generation["engine"], string> = {
  native: "Natif",
  anthropic: "Claude",
  openai: "OpenAI",
};

export const GENERATION_STATUSES: GenerationStatus[] = [
  "draft",
  "editing",
  "validated",
  "published",
];

/** Variante retenue : celle marquée finale, sinon la première. */
export const selectedVariant = (g: Generation): Variant | undefined =>
  g.variants.find((v) => v.selected) ?? g.variants[0];

/** Texte final : celui validé, sinon la dernière version de la variante retenue. */
export const finalTextOf = (g: Generation): string =>
  g.finalText ?? selectedVariant(g)?.revisions.at(-1)?.text ?? "";

/** Texte d'origine de la variante retenue (première révision, sortie du moteur). */
export const initialTextOf = (g: Generation): string =>
  selectedVariant(g)?.revisions[0]?.text ?? "";

export interface HistoryFilters {
  status?: GenerationStatus;
  mode?: Mode;
}

export function filterHistory(
  generations: readonly Generation[],
  filters: HistoryFilters,
): Generation[] {
  return generations
    .filter(
      (g) =>
        (!filters.status || g.status === filters.status) &&
        (!filters.mode || g.brief.mode === filters.mode),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** Générations validées ou publiées pas encore versées dans la bibliothèque. */
export function pendingReferences(generations: readonly Generation[]): Generation[] {
  return generations
    .filter((g) => (g.status === "validated" || g.status === "published") && !g.savedToLibraryId)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** Changements de statut proposés depuis l'historique, selon le statut courant. */
export type StatusAction = "validate" | "reopen" | "publish";

export function statusActions(status: GenerationStatus): StatusAction[] {
  if (status === "draft" || status === "editing") return ["validate", "publish"];
  if (status === "validated") return ["reopen", "publish"];
  return [];
}
