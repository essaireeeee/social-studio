/**
 * Conversion d'un résultat de moteur en `Generation` (section 13.7) : une variante par
 * type, une première révision d'origine « moteur », la variante Signature sélectionnée.
 */
import { newId } from "@/lib/database/hash";
import type { Brief, Engine, Generation, Variant, VariantKind } from "@/types/domain";
import type { NativeVariant } from "./native/engine";

export interface BuildGenerationInput {
  brief: Brief;
  engine: Engine;
  variants: readonly Pick<NativeVariant, "kind" | "text" | "factWarnings">[];
  referenceIds: readonly string[];
  fallbackReason?: string;
  now?: Date;
}

export const RECOMMENDED_VARIANT: VariantKind = "signature";

export function buildGeneration(input: BuildGenerationInput): Generation {
  const timestamp = (input.now ?? new Date()).toISOString();
  const variants: Variant[] = input.variants.map((variant) => ({
    id: newId(),
    kind: variant.kind,
    selected: variant.kind === RECOMMENDED_VARIANT,
    revisions: [
      {
        id: newId(),
        text: variant.text,
        createdAt: timestamp,
        origin: input.engine,
        factWarnings: variant.factWarnings,
      },
    ],
  }));
  return {
    id: newId(),
    createdAt: timestamp,
    updatedAt: timestamp,
    brief: input.brief,
    engine: input.engine,
    fallbackReason: input.fallbackReason,
    referenceIds: [...input.referenceIds],
    variants,
    status: "draft",
  };
}

/** Texte courant d'une variante : sa dernière révision. */
export function currentText(variant: Variant): string {
  return variant.revisions.at(-1)?.text ?? "";
}

/** Accroche retenue d'une génération validée : texte final, sinon variante sélectionnée. */
export function generationHook(generation: Generation): string | undefined {
  const text =
    generation.finalText ??
    generation.variants.find((v) => v.selected)?.revisions.at(-1)?.text ??
    generation.variants[0]?.revisions.at(-1)?.text;
  return text
    ?.split("\n")
    .find((line) => line.trim())
    ?.trim();
}
