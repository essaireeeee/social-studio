/**
 * Génération native depuis la base : rassemble le contexte stocké (catégorie, réglages,
 * règles, profil validé, références, Session Live, événement, signature, hashtags,
 * accroches récentes et gardées), lance le moteur et enregistre la génération (brouillon).
 */
import { getCategory } from "@/lib/categories/registry";
import type { DataRepository } from "@/lib/database/repository";
import { activeProfile, listProfiles, styleParameters } from "@/lib/editorial/profile-service";
import { loadRules } from "@/lib/editorial/rule-service";
import type { ReferenceResult, Retriever } from "@/lib/retrieval/retriever";
import { findReferences } from "@/lib/retrieval/service";
import type { Brief, Generation, StyleProfile } from "@/types/domain";
import { buildAllowedFacts, factGuard } from "./fact-guard";
import { buildBriefContext, findEvent } from "./native/context";
import { generateNative, type NativeResult } from "./native/engine";
import { loadHookBank } from "./native/hooks";
import { renderSignature, signatureValues } from "./signature";
import { buildGeneration, generationHook } from "./variants";

/** CTA de billetterie : jamais sur une défaite ni une réaction (section 10.5). */
const TICKETING = /billet|places|r[ée]serv/i;

export interface GenerateOptions {
  /** Compteur de régénération : change la graine, donc les formulations. */
  regenerationCount?: number;
  /** Références écartées par le CM pour cette génération. */
  excludeIds?: readonly string[];
  includeDemoReferences?: boolean;
  /** Faux : ne pas enregistrer la génération (aperçu, tests). */
  persist?: boolean;
  now?: Date;
}

export interface GenerateOutcome {
  generation: Generation;
  result: NativeResult;
  references: ReferenceResult[];
  /** Signature choisie mais non ajoutée, et pourquoi. */
  signatureIssue?: { missing: string[]; needsConfirmedSchedule: boolean };
}

/** CTA du profil le plus fréquent pour la catégorie, s'il ne contient aucun fait non fourni. */
function profileCta(
  profile: StyleProfile | undefined,
  categoryId: string,
  facts: string[],
): string | undefined {
  const allowed = buildAllowedFacts(facts);
  return profile?.ctas.top
    .filter((c) => c.categoryId === categoryId)
    .map((c) => c.text)
    .find((text) => factGuard(text, { allowed }).length === 0);
}

export async function generateNativeForBrief(
  repository: DataRepository,
  retriever: Retriever,
  brief: Brief,
  options: GenerateOptions = {},
): Promise<GenerateOutcome> {
  const category = getCategory(brief.categoryId);
  if (!category || category.mode !== brief.mode) {
    throw new Error(`Catégorie inconnue pour ce mode : ${brief.categoryId}`);
  }
  const now = options.now ?? new Date();
  const [
    settings,
    rules,
    profiles,
    fighters,
    events,
    sessions,
    signatures,
    groups,
    generations,
    hookBank,
  ] = await Promise.all([
    repository.getSettings(),
    loadRules(repository),
    listProfiles(repository, brief.mode),
    repository.fighters.list(),
    repository.events.list(),
    repository.liveSessions.list(),
    repository.signatures.list(),
    repository.hashtagGroups.list(),
    repository.generations.list({ orderBy: "createdAt", reverse: true, limit: 200 }),
    loadHookBank(repository),
  ]);

  const liveSession =
    brief.mode === "live"
      ? (sessions.find((s) => s.id === brief.liveSessionId) ?? sessions.find((s) => s.active))
      : undefined;
  const eventValue = typeof brief.fields.event === "string" ? brief.fields.event : undefined;
  const event =
    (eventValue ? findEvent(eventValue, events) : undefined) ??
    (liveSession?.eventId ? events.find((e) => e.id === liveSession.eventId) : undefined);

  const hashtags = [
    ...new Set(groups.filter((g) => brief.hashtagIds.includes(g.id)).flatMap((g) => g.tags)),
  ];

  const signature = brief.signatureId
    ? signatures.find((s) => s.id === brief.signatureId)
    : undefined;
  const rendered = signature
    ? renderSignature(
        signature,
        signatureValues({ event, liveSession, fields: brief.fields }),
        event?.confirmedSchedule === true,
      )
    : undefined;

  const profile = activeProfile(profiles);
  const params = styleParameters(profile, brief.mode);

  // Contexte une première fois sans CTA, pour vérifier le CTA du profil contre les faits.
  const baseContext = buildBriefContext(brief, category, {
    fighters,
    events,
    event,
    liveSession,
    hashtags,
    signatureText: rendered?.text,
  });
  let cta = brief.cta?.trim() || profileCta(profile, category.id, baseContext.facts);
  if (cta && category.ticketingCta === false && TICKETING.test(cta)) cta = undefined;
  const context = cta
    ? buildBriefContext(brief, category, {
        fighters,
        events,
        event,
        liveSession,
        hashtags,
        signatureText: rendered?.text,
        cta,
      })
    : baseContext;

  const references = await findReferences(repository, retriever, brief, {
    excludeIds: options.excludeIds,
    includeDemo: options.includeDemoReferences,
    now,
  });

  const recentHooks = generations
    .filter((g) => g.status === "validated" || g.status === "published")
    .slice(0, 20)
    .map(generationHook)
    .filter((hook): hook is string => Boolean(hook));

  const result = generateNative({
    brief,
    category,
    context,
    style: { params, profile },
    references: references.map((r) => ({ id: r.wording.id, text: r.wording.text })),
    recentHooks,
    savedHooks: hookBank,
    rules,
    frenchSpacing: settings.frenchSpacing,
    regenerationCount: options.regenerationCount ?? 0,
    variantOrder: settings.variantOrder,
    broadcasters: settings.quickOptions.broadcasters.filter((b) => !["Autre", "Aucun"].includes(b)),
  });

  const generation = buildGeneration({
    brief,
    engine: "native",
    variants: result.variants,
    referenceIds: references.map((r) => r.wording.id),
    now,
  });
  if (options.persist !== false) await repository.generations.put(generation);

  return {
    generation,
    result,
    references,
    signatureIssue:
      rendered && !rendered.text
        ? { missing: rendered.missing, needsConfirmedSchedule: rendered.needsConfirmedSchedule }
        : undefined,
  };
}
