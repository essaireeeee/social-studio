/**
 * Révisions et statuts d'une génération (sections 13.4 et 13.7). Rien n'est jamais écrasé :
 * chaque retouche, restauration ou édition ajoute une révision ; seule la révision d'édition
 * en cours (frappes successives sans quitter le champ plus de 5 s) est complétée.
 * Logique pure.
 */
import { newId } from "@/lib/database/hash";
import type { FactWarning, Generation, Revision, Variant } from "@/types/domain";

/** Au-delà de ce délai hors du champ, la frappe suivante ouvre une nouvelle révision. */
export const EDIT_MERGE_WINDOW_MS = 5000;

export type ContentStatus = "generated" | "edited" | "validated" | "published";

export const CONTENT_STATUS_LABELS: Record<ContentStatus, string> = {
  generated: "Générée",
  edited: "Modifiée",
  validated: "Validée",
  published: "Publiée",
};

export const ORIGIN_LABELS: Record<Revision["origin"], string> = {
  native: "Natif",
  anthropic: "Claude",
  openai: "OpenAI",
  cm_edit: "Édition CM",
};

export const ACTION_LABELS: Record<NonNullable<Revision["action"]>, string> = {
  shorten: "Raccourcir",
  punchier: "Plus percutant",
  institutional: "Plus institutionnel",
  new_hook: "Nouvelle accroche",
  toggle_emojis: "Emojis +/-",
  rephrase: "Reformuler",
  regenerate: "Régénérer",
  custom: "Consigne",
  restore: "Restauration",
};

function mapVariant(generation: Generation, variantId: string, fn: (v: Variant) => Variant) {
  return generation.variants.map((v) => (v.id === variantId ? fn(v) : v));
}

/** Statut d'une variante pour l'affichage, sans jamais confondre les quatre états. */
export function contentStatus(generation: Generation, variant: Variant): ContentStatus {
  const final = generation.variants.find((v) => v.selected) ?? variant;
  if (generation.status === "published" && final.id === variant.id) return "published";
  if (generation.status === "validated" && final.id === variant.id) return "validated";
  return variant.revisions.at(-1)?.origin === "cm_edit" ? "edited" : "generated";
}

export interface EditInput {
  text: string;
  factWarnings: FactWarning[];
  now: Date;
  /** Révision d'édition en cours à compléter (même passage dans le champ). */
  mergeInto?: string;
}

/**
 * Édition du CM : complète la révision `cm_edit` en cours si c'est la dernière, sinon en
 * ajoute une. La première édition fait passer la génération de `draft` à `editing`.
 */
export function recordEdit(
  generation: Generation,
  variantId: string,
  input: EditInput,
): { generation: Generation; revisionId: string } {
  const variant = generation.variants.find((v) => v.id === variantId);
  if (!variant) throw new Error("Variante introuvable.");
  const last = variant.revisions.at(-1)!;
  const timestamp = input.now.toISOString();
  const merge = input.mergeInto && last.id === input.mergeInto && last.origin === "cm_edit";
  const revision: Revision = merge
    ? { ...last, text: input.text, factWarnings: input.factWarnings }
    : {
        id: newId(),
        text: input.text,
        createdAt: timestamp,
        origin: "cm_edit",
        factWarnings: input.factWarnings,
      };
  return {
    revisionId: revision.id,
    generation: {
      ...generation,
      updatedAt: timestamp,
      status: generation.status === "draft" ? "editing" : generation.status,
      variants: mapVariant(generation, variantId, (v) => ({
        ...v,
        revisions: merge ? [...v.revisions.slice(0, -1), revision] : [...v.revisions, revision],
      })),
    },
  };
}

/** Revenir à une révision : sa copie devient la plus récente, l'historique reste entier. */
export function restoreRevision(
  generation: Generation,
  variantId: string,
  revisionId: string,
  now: Date,
): Generation {
  const variant = generation.variants.find((v) => v.id === variantId);
  const source = variant?.revisions.find((r) => r.id === revisionId);
  if (!variant || !source) throw new Error("Révision introuvable.");
  const revision: Revision = {
    id: newId(),
    text: source.text,
    createdAt: now.toISOString(),
    origin: source.origin,
    action: "restore",
    factWarnings: source.factWarnings,
    ...(source.templateId ? { templateId: source.templateId } : {}),
  };
  return {
    ...generation,
    updatedAt: revision.createdAt,
    variants: mapVariant(generation, variantId, (v) => ({
      ...v,
      revisions: [...v.revisions, revision],
    })),
  };
}

/** Variante affichée dans l'aperçu (une seule sélectionnée). */
export function selectVariant(generation: Generation, variantId: string): Generation {
  if (generation.status === "validated" || generation.status === "published") return generation;
  return {
    ...generation,
    variants: generation.variants.map((v) => ({ ...v, selected: v.id === variantId })),
  };
}

/** Valider : la variante devient le texte final, la génération passe à `validated`. */
export function validateVariant(generation: Generation, variantId: string, now: Date): Generation {
  const variant = generation.variants.find((v) => v.id === variantId);
  if (!variant) throw new Error("Variante introuvable.");
  return {
    ...generation,
    updatedAt: now.toISOString(),
    status: "validated",
    finalText: variant.revisions.at(-1)!.text,
    finalPlatform: generation.brief.platform,
    variants: generation.variants.map((v) => ({ ...v, selected: v.id === variantId })),
  };
}

/** Repasser en édition après une validation (le texte final est retiré). */
export function reopenGeneration(generation: Generation, now: Date): Generation {
  if (generation.status !== "validated") return generation;
  const { finalText: _final, finalPlatform: _platform, ...rest } = generation;
  return { ...rest, status: "editing", updatedAt: now.toISOString() };
}

/** Publiée : action manuelle du CM, avec la date et le lien éventuel. Valide si besoin. */
export function markPublished(
  generation: Generation,
  variantId: string,
  input: { publishedAt: string; url?: string; now: Date },
): Generation {
  const validated =
    generation.status === "validated" &&
    generation.variants.find((v) => v.selected)?.id === variantId
      ? generation
      : validateVariant(generation, variantId, input.now);
  return {
    ...validated,
    status: "published",
    publishedAt: input.publishedAt,
    ...(input.url ? { publishedUrl: input.url } : {}),
    updatedAt: input.now.toISOString(),
  };
}
