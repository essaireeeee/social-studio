/**
 * Contexte d'une génération, rassemblé depuis la base (section 10) : catégorie, réglages,
 * règles, profil validé, références, Session Live, événement, signature, hashtags, CTA,
 * accroches récentes et gardées. Partagé par le moteur natif, l'IA et les retouches,
 * pour que les trois partent exactement des mêmes faits.
 */
import { getCategory, type CategoryDef } from "@/lib/categories/registry";
import type { DataRepository } from "@/lib/database/repository";
import {
  activeProfile,
  listProfiles,
  styleParameters,
  type StyleParameters,
} from "@/lib/editorial/profile-service";
import { loadRules } from "@/lib/editorial/rule-service";
import type { ReferenceResult, Retriever } from "@/lib/retrieval/retriever";
import { findReferences } from "@/lib/retrieval/service";
import type { Brief, EditorialRule, SavedHook, Settings, StyleProfile } from "@/types/domain";
import { buildAllowedFacts, factGuard } from "./fact-guard";
import { buildBriefContext, findEvent, type BriefContext } from "./native/context";
import type { NativeEngineInput } from "./native/engine";
import { loadHookBank } from "./native/hooks";
import { renderSignature, signatureValues } from "./signature";
import { generationHook } from "./variants";

/** CTA de billetterie : jamais sur une défaite ni une réaction (section 10.5). */
export const TICKETING_CTA = /billet|places|r[ée]serv/i;

export interface LoadOptions {
  /** Références écartées par le CM pour cette génération. */
  excludeIds?: readonly string[];
  includeDemoReferences?: boolean;
  now?: Date;
}

export interface SignatureIssue {
  missing: string[];
  needsConfirmedSchedule: boolean;
}

export interface GenerationContext {
  brief: Brief;
  category: CategoryDef;
  settings: Settings;
  rules: EditorialRule[];
  profile?: StyleProfile;
  params: StyleParameters;
  context: BriefContext;
  references: ReferenceResult[];
  recentHooks: string[];
  hookBank: SavedHook[];
  hashtags: string[];
  /** Diffuseurs connus (options rapides), pour le Fact Guard. */
  broadcasters: string[];
  cta?: string;
  signatureText?: string;
  /** Signature choisie mais non ajoutée, et pourquoi. */
  signatureIssue?: SignatureIssue;
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

export async function loadGenerationContext(
  repository: DataRepository,
  retriever: Retriever,
  brief: Brief,
  options: LoadOptions = {},
): Promise<GenerationContext> {
  const category = getCategory(brief.categoryId);
  if (!category || category.mode !== brief.mode) {
    throw new Error(`Catégorie inconnue pour ce mode : ${brief.categoryId}`);
  }
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
  const sources = {
    fighters,
    events,
    event,
    liveSession,
    hashtags,
    signatureText: rendered?.text,
  };

  // Contexte une première fois sans CTA, pour vérifier le CTA du profil contre les faits.
  const baseContext = buildBriefContext(brief, category, sources);
  let cta = brief.cta?.trim() || profileCta(profile, category.id, baseContext.facts);
  if (cta && category.ticketingCta === false && TICKETING_CTA.test(cta)) cta = undefined;
  const context = cta ? buildBriefContext(brief, category, { ...sources, cta }) : baseContext;

  const references = await findReferences(repository, retriever, brief, {
    excludeIds: options.excludeIds,
    includeDemo: options.includeDemoReferences,
    now: options.now ?? new Date(),
  });

  const recentHooks = generations
    .filter((g) => g.status === "validated" || g.status === "published")
    .slice(0, 20)
    .map(generationHook)
    .filter((hook): hook is string => Boolean(hook));

  return {
    brief,
    category,
    settings,
    rules,
    profile,
    params,
    context,
    references,
    recentHooks,
    hookBank,
    hashtags,
    broadcasters: settings.quickOptions.broadcasters.filter((b) => !["Autre", "Aucun"].includes(b)),
    cta,
    signatureText: rendered?.text,
    signatureIssue:
      rendered && !rendered.text
        ? { missing: rendered.missing, needsConfirmedSchedule: rendered.needsConfirmedSchedule }
        : undefined,
  };
}

/** Entrée du moteur natif pour ce contexte. */
export function nativeInput(loaded: GenerationContext, regenerationCount = 0): NativeEngineInput {
  return {
    brief: loaded.brief,
    category: loaded.category,
    context: loaded.context,
    style: { params: loaded.params, profile: loaded.profile },
    references: loaded.references.map((r) => ({ id: r.wording.id, text: r.wording.text })),
    recentHooks: loaded.recentHooks,
    savedHooks: loaded.hookBank,
    rules: loaded.rules,
    frenchSpacing: loaded.settings.frenchSpacing,
    regenerationCount,
    variantOrder: loaded.settings.variantOrder,
    broadcasters: loaded.broadcasters,
  };
}
