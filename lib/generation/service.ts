/**
 * Génération native depuis la base : rassemble le contexte stocké (`loadGenerationContext`),
 * lance le moteur et enregistre la génération (brouillon).
 */
import type { DataRepository } from "@/lib/database/repository";
import type { ReferenceResult, Retriever } from "@/lib/retrieval/retriever";
import type { Brief, Generation } from "@/types/domain";
import {
  loadGenerationContext,
  nativeInput,
  type GenerationContext,
  type LoadOptions,
  type SignatureIssue,
} from "./context-loader";
import { generateNative, type NativeResult } from "./native/engine";
import { buildGeneration } from "./variants";

export interface GenerateOptions extends LoadOptions {
  /** Compteur de régénération : change la graine, donc les formulations. */
  regenerationCount?: number;
  /** Faux : ne pas enregistrer la génération (aperçu, tests). */
  persist?: boolean;
  /** Motif de bascule quand l'IA a échoué (section 11.2). */
  fallbackReason?: string;
  /** Contexte déjà chargé (bascule depuis l'IA) : évite une seconde lecture de la base. */
  loaded?: GenerationContext;
}

export interface GenerateOutcome {
  generation: Generation;
  result: NativeResult;
  references: ReferenceResult[];
  /** Signature choisie mais non ajoutée, et pourquoi. */
  signatureIssue?: SignatureIssue;
}

export async function generateNativeForBrief(
  repository: DataRepository,
  retriever: Retriever,
  brief: Brief,
  options: GenerateOptions = {},
): Promise<GenerateOutcome> {
  const now = options.now ?? new Date();
  const loaded =
    options.loaded ??
    (await loadGenerationContext(repository, retriever, brief, { ...options, now }));
  const result = generateNative(nativeInput(loaded, options.regenerationCount ?? 0));

  const generation = buildGeneration({
    brief,
    engine: "native",
    variants: result.variants,
    referenceIds: loaded.references.map((r) => r.wording.id),
    fallbackReason: options.fallbackReason,
    now,
  });
  if (options.persist !== false) await repository.generations.put(generation);

  return {
    generation,
    result,
    references: loaded.references,
    signatureIssue: loaded.signatureIssue,
  };
}
