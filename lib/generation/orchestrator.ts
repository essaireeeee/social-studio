/**
 * Orchestration côté client (sections 11.2 et 11.4) : choisit le moteur selon les réglages,
 * appelle la route IA, bascule automatiquement sur le moteur natif en cas d'échec avec un
 * message clair, et enregistre le résultat. Chaque retouche ajoute une `Revision` :
 * rien n'est écrasé.
 */
import type { GenerateRequest, StyleSummary } from "@/lib/ai/schema";
import type { AiVariantResult } from "@/lib/ai/service";
import type { ProviderId } from "@/lib/ai/types";
import type { DataRepository } from "@/lib/database/repository";
import { newId } from "@/lib/database/hash";
import type { StyleParameters } from "@/lib/editorial/profile-service";
import type { ReferenceResult, Retriever } from "@/lib/retrieval/retriever";
import type {
  Brief,
  Engine,
  Generation,
  Platform,
  RefineAction,
  Revision,
  StyleProfile,
  VariantKind,
} from "@/types/domain";
import { fetchTransport, type AiTransport } from "./ai-client";
import {
  loadGenerationContext,
  nativeInput,
  type GenerationContext,
  type LoadOptions,
  type SignatureIssue,
} from "./context-loader";
import { declineNative } from "./native/decline";
import { prepareNative } from "./native/engine";
import { CUSTOM_NATIVE_MESSAGE, RefineUnavailableError, refineNative } from "./native/refine";
import type { PostProcessResult } from "./post-process";
import { generateNativeForBrief } from "./service";
import { buildGeneration, currentText } from "./variants";

export const fallbackNotice = (reason: string) =>
  `Génération IA indisponible (${reason}). Propositions produites par le moteur natif.`;
export const refineFallbackNotice = (reason: string) =>
  `Retouche IA indisponible (${reason}). Retouche faite par le moteur natif.`;

/** Une proposition, quel que soit le moteur : texte final et contrôles du post-traitement. */
export interface VariantView extends PostProcessResult {
  kind: VariantKind;
  hook: string;
}

export interface StudioOutcome {
  generation: Generation;
  engine: Engine;
  variants: VariantView[];
  references: ReferenceResult[];
  signatureIssue?: SignatureIssue;
  /** Message de bascule vers le moteur natif, à afficher tel quel. */
  notice?: string;
}

export interface StudioOptions extends LoadOptions {
  regenerationCount?: number;
  persist?: boolean;
  transport?: AiTransport;
}

// ---------------------------------------------------------------------------
// Corps des requêtes IA
// ---------------------------------------------------------------------------

/** Résumé du profil validé transmis au prompt (aucune donnée d'un profil seulement proposé). */
export function styleSummary(
  profile: StyleProfile | undefined,
  params: StyleParameters,
  categoryId: string,
): StyleSummary {
  const validated = params.source === "profile" ? profile : undefined;
  const forCategory = <T extends { categoryId?: string }>(items: readonly T[]) => [
    ...items.filter((i) => i.categoryId === categoryId),
    ...items.filter((i) => !i.categoryId),
  ];
  return {
    source: params.source,
    corpusSize: params.corpusSize,
    confidence: validated?.confidence,
    charsMedian: params.charsMedian,
    charsP90: params.charsP90,
    linesMedian: params.linesMedian,
    emojisPerPostMedian: params.emojisPerPostMedian,
    hashtagPosition: params.hashtagPosition,
    topEmojis: validated?.emojis.top.slice(0, 8).map((e) => e.emoji) ?? [],
    fingerprints: [
      ...new Set(forCategory(validated?.structures ?? []).map((s) => s.fingerprint)),
    ].slice(0, 5),
    hookPatterns: validated?.hooks.patterns.slice(0, 5).map((p) => p.pattern) ?? [],
    ctas: [...new Set(forCategory(validated?.ctas.top ?? []).map((c) => c.text))].slice(0, 5),
    overused: validated?.overused.slice(0, 20).map((o) => o.expression) ?? [],
  };
}

function commonBody(loaded: GenerationContext, provider: ProviderId) {
  return {
    provider,
    brief: { ...loaded.brief, cta: loaded.cta },
    facts: loaded.context.facts,
    rules: loaded.rules,
    hashtags: loaded.hashtags,
    broadcasters: loaded.broadcasters,
    lint: {
      frenchSpacing: loaded.settings.frenchSpacing,
      emojiThreshold: loaded.params.emojiThreshold,
      recentHooks: loaded.recentHooks,
    },
  };
}

const aiReferences = (references: readonly ReferenceResult[]) =>
  references.slice(0, 10).map((r) => ({
    id: r.wording.id,
    text: r.wording.text,
    categoryId: r.wording.categoryId,
    date: r.wording.date?.slice(0, 10),
  }));

export function generateBody(loaded: GenerationContext, provider: ProviderId): GenerateRequest {
  return {
    ...commonBody(loaded, provider),
    platform: loaded.brief.platform,
    references: aiReferences(loaded.references),
    styleProfileSummary: styleSummary(loaded.profile, loaded.params, loaded.category.id),
    signature: loaded.signatureText,
  };
}

// ---------------------------------------------------------------------------
// Génération
// ---------------------------------------------------------------------------

function orderVariants<T extends { kind: VariantKind }>(
  variants: readonly T[],
  order: readonly VariantKind[],
): T[] {
  return order
    .map((kind) => variants.find((v) => v.kind === kind))
    .filter((v): v is T => Boolean(v));
}

export async function generateForBrief(
  repository: DataRepository,
  retriever: Retriever,
  brief: Brief,
  options: StudioOptions = {},
): Promise<StudioOutcome> {
  const now = options.now ?? new Date();
  const loaded = await loadGenerationContext(repository, retriever, brief, { ...options, now });
  const engine = loaded.settings.aiProvider;

  const runNative = async (reason?: string): Promise<StudioOutcome> => {
    const outcome = await generateNativeForBrief(repository, retriever, brief, {
      ...options,
      now,
      loaded,
      fallbackReason: reason,
    });
    return {
      generation: outcome.generation,
      engine: "native",
      variants: outcome.result.variants,
      references: outcome.references,
      signatureIssue: outcome.signatureIssue,
      notice: reason ? fallbackNotice(reason) : undefined,
    };
  };
  if (engine === "native") return runNative();

  const transport = options.transport ?? fetchTransport;
  const response = await transport.generate(generateBody(loaded, engine));
  if (response.fallback) return runNative(response.reason);

  const variants: AiVariantResult[] = orderVariants(
    response.variants,
    loaded.settings.variantOrder,
  );
  const generation = buildGeneration({
    brief,
    engine,
    variants,
    referenceIds: loaded.references.map((r) => r.wording.id),
    now,
  });
  if (options.persist !== false) await repository.generations.put(generation);
  return {
    generation,
    engine,
    variants,
    references: loaded.references,
    signatureIssue: loaded.signatureIssue,
  };
}

// ---------------------------------------------------------------------------
// Retouche
// ---------------------------------------------------------------------------

export interface RefineOutcome {
  generation: Generation;
  revision: Revision;
  result: PostProcessResult;
  notice?: string;
}

export interface RefineOptions {
  instruction?: string;
  transport?: AiTransport;
  now?: Date;
}

/** Action disponible avec ce moteur, sinon le message de l'infobulle (section 11.4). */
export function refineAvailability(engine: Engine, action: RefineAction): string | null {
  return engine === "native" && action === "custom" ? CUSTOM_NATIVE_MESSAGE : null;
}

export async function refineVariant(
  repository: DataRepository,
  retriever: Retriever,
  generationId: string,
  variantId: string,
  action: RefineAction,
  options: RefineOptions = {},
): Promise<RefineOutcome> {
  const generation = await repository.generations.get(generationId);
  const variant = generation?.variants.find((v) => v.id === variantId);
  if (!generation || !variant) throw new Error("Génération introuvable.");
  const now = options.now ?? new Date();
  const loaded = await loadGenerationContext(repository, retriever, generation.brief, { now });
  const engine = loaded.settings.aiProvider;
  const text = currentText(variant);
  const instruction = options.instruction?.trim() || undefined;

  let origin: Revision["origin"] = "native";
  let result: PostProcessResult & { templateId?: string };
  let notice: string | undefined;

  const native = () =>
    refineNative({
      engine: nativeInput(loaded),
      kind: variant.kind,
      text,
      templateId: [...variant.revisions].reverse().find((r) => r.templateId)?.templateId,
      action,
      count: variant.revisions.length,
    });

  if (engine === "native") {
    result = native();
  } else {
    const transport = options.transport ?? fetchTransport;
    const response = await transport.refine({
      ...commonBody(loaded, engine),
      action,
      instruction,
      text,
      references: aiReferences(loaded.references),
    });
    if (!response.fallback) {
      origin = engine;
      result = response.result;
    } else if (action === "custom") {
      throw new RefineUnavailableError(`Consigne libre indisponible (${response.reason}).`);
    } else {
      result = native();
      notice = refineFallbackNotice(response.reason);
    }
  }

  const revision: Revision = {
    id: newId(),
    text: result.text,
    createdAt: now.toISOString(),
    origin,
    action,
    ...(instruction && action === "custom" ? { instruction } : {}),
    factWarnings: result.factWarnings,
    ...(origin === "native" && result.templateId ? { templateId: result.templateId } : {}),
  };
  const updated: Generation = {
    ...generation,
    updatedAt: revision.createdAt,
    variants: generation.variants.map((v) =>
      v.id === variantId ? { ...v, revisions: [...v.revisions, revision] } : v,
    ),
  };
  await repository.generations.put(updated);
  return { generation: updated, revision, result, notice };
}

// ---------------------------------------------------------------------------
// Déclinaison
// ---------------------------------------------------------------------------

export const declineFallbackNotice = (reason: string) =>
  `Déclinaison IA indisponible (${reason}). Versions produites par le moteur natif.`;

export interface DeclineOutcome {
  generation: Generation;
  versions: Partial<Record<Platform, PostProcessResult>>;
  notice?: string;
}

/**
 * Une version par plateforme autre que la principale, depuis le texte courant de la variante.
 * Les versions sont enregistrées dans la génération (`declinations`).
 */
export async function declineVariant(
  repository: DataRepository,
  retriever: Retriever,
  generationId: string,
  variantId: string,
  options: { transport?: AiTransport; now?: Date } = {},
): Promise<DeclineOutcome> {
  const generation = await repository.generations.get(generationId);
  const variant = generation?.variants.find((v) => v.id === variantId);
  if (!generation || !variant) throw new Error("Génération introuvable.");
  const loaded = await loadGenerationContext(repository, retriever, generation.brief, {
    now: options.now,
  });
  const text = currentText(variant);
  const targets = (["instagram", "facebook", "x", "tiktok"] as const).filter(
    (p) => p !== generation.brief.platform,
  );
  const engine = loaded.settings.aiProvider;

  let versions: Partial<Record<Platform, PostProcessResult>> | undefined;
  let notice: string | undefined;
  if (engine !== "native") {
    const transport = options.transport ?? fetchTransport;
    const response = await transport.decline({ ...commonBody(loaded, engine), text, targets });
    if (response.fallback) notice = declineFallbackNotice(response.reason);
    else versions = response.versions;
  }
  if (!versions) {
    const source = prepareNative(nativeInput(loaded));
    versions = declineNative(text, targets, {
      vars: loaded.context.vars,
      process: (raw, platform) => source.processText(raw, platform),
    });
  }

  const declinations = Object.fromEntries(
    Object.entries(versions).map(([platform, result]) => [platform, result!.text]),
  ) as Partial<Record<Platform, string>>;
  const updated: Generation = {
    ...generation,
    declinations,
    updatedAt: (options.now ?? new Date()).toISOString(),
  };
  await repository.generations.put(updated);
  return { generation: updated, versions, notice };
}
