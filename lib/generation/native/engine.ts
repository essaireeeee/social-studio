/**
 * Moteur natif (section 10) : compose trois variantes à partir des modèles, du profil de
 * style et des références, sans appel réseau. Déterministe à graine égale. Logique pure.
 *
 * Sélection (10.6) : score = 1 − 0,4 × similarité d'accroche (20 dernières validées)
 *                          − 0,3 × expression « À varier » présente
 *                          − 0,3 × écart à la longueur cible
 * puis combinaison des trois variantes : accroches mutuellement différentes (Jaccard < 0,5),
 * structures différentes, aucune copie de référence. Jusqu'à 5 re-tirages.
 */
import type { CategoryDef } from "@/lib/categories/registry";
import { EMOJI_CAP_BY_CATEGORY, rankEmojis } from "@/lib/editorial/emoji";
import { compileNameMatchers, hookPattern, type NameMatchers } from "@/lib/editorial/hook-pattern";
import type { StyleParameters } from "@/lib/editorial/profile-service";
import { RULE_IDS } from "@/lib/editorial/rules";
import {
  countGraphemes,
  jaccard,
  normalizeText,
  tokenizeWords,
  wordSet,
} from "@/lib/editorial/text-utils";
import type {
  Brief,
  EditorialRule,
  Platform,
  SavedHook,
  StyleProfile,
  VariantKind,
} from "@/types/domain";
import { copyCheck, type CopySource } from "../anti-copy";
import { buildAllowedFacts } from "../fact-guard";
import { postProcess, type PostProcessResult } from "../post-process";
import { createRng, hashString, seedFor } from "../random";
import { collapseBlocks, compose, type Composition } from "./composer";
import type { BriefContext } from "./context";
import { OPTIONAL_ROLES } from "./templates/factory";
import { TEMPLATE_VOCABULARY, copyFor, templatesFor } from "./templates";
import type { Block, Segment, SegmentRole, Template } from "./types";

export const DEFAULT_VARIANT_ORDER: readonly VariantKind[] = [
  "signature",
  "punchy",
  "storytelling",
];
const MAX_ATTEMPTS = 5;
const HOOK_SIMILARITY_LIMIT = 0.5;
const POOL = 3;

export interface NativeEngineInput {
  brief: Brief;
  category: CategoryDef;
  context: BriefContext;
  style: { params: StyleParameters; profile?: StyleProfile };
  references: readonly CopySource[];
  /** Accroches des 20 dernières générations validées. */
  recentHooks: readonly string[];
  savedHooks?: readonly SavedHook[];
  rules: readonly EditorialRule[];
  frenchSpacing: boolean;
  regenerationCount: number;
  variantOrder?: readonly VariantKind[];
  /** Diffuseurs connus (options rapides), pour le Fact Guard. */
  broadcasters?: readonly string[];
}

export interface NativeVariant extends Omit<PostProcessResult, "adapted"> {
  kind: VariantKind;
  hook: string;
  structure: string;
  templateId: string;
  score: number;
  adapted: boolean;
}

export interface NativeResult {
  variants: NativeVariant[];
  seed: number;
  attempts: number;
  durationMs: number;
}

export interface Candidate {
  kind: VariantKind;
  composition: Composition;
  enriched?: Composition;
  score: number;
  hookWords: Set<string>;
}

// ---------------------------------------------------------------------------
// Paramètres par variante
// ---------------------------------------------------------------------------

function lengthTarget(kind: VariantKind, params: StyleParameters): number {
  if (kind === "punchy") return Math.min(280, Math.max(60, params.charsMedian * 0.5));
  if (kind === "signature") return params.charsMedian;
  return (params.charsMedian + params.charsP90) / 2;
}

function emojiBudget(kind: VariantKind, params: StyleParameters, categoryId: string): number {
  const median = Math.round(params.emojisPerPostMedian);
  const base = kind === "punchy" ? Math.min(2, Math.max(1, median)) : Math.max(0, median);
  const cap = EMOJI_CAP_BY_CATEGORY[categoryId];
  return cap === undefined ? base : Math.min(cap, base);
}

const VALID_BLOCKS = new Set<Block>(["H", "B", "I", "Q", "C", "T", "S"]);

/** Empreinte la plus fréquente de la catégorie dans le profil, si elle est exploitable. */
function profileOrder(profile: StyleProfile | undefined, categoryId: string): Block[] | undefined {
  const fingerprint = profile?.structures.find((s) => s.categoryId === categoryId)?.fingerprint;
  const blocks = fingerprint?.split("-") as Block[] | undefined;
  if (
    !blocks ||
    blocks[0] !== "H" ||
    !blocks.includes("B") ||
    !blocks.every((b) => VALID_BLOCKS.has(b))
  ) {
    return undefined;
  }
  return blocks;
}

/** Règle Samba Sima appliquée par le moteur lui-même, en contexte positif (section 1.6). */
function sambaSegment(input: NativeEngineInput): Segment | null {
  const { category, context, rules } = input;
  const rule = rules.find((r) => r.id === RULE_IDS.sambaSima);
  if (
    !rule?.enabled ||
    category.context !== "positive" ||
    category.disabledRules?.includes(rule.id)
  ) {
    return null;
  }
  const losing = new Set(["loser", "challenger", "opponent"]);
  const present = Object.entries(context.vars).some(
    ([key, value]) =>
      !losing.has(key) &&
      !key.endsWith("Short") &&
      normalizeText(value).split(" ").join(" ").includes("samba sima"),
  );
  if (!present) return null;
  return {
    block: "B",
    role: "samba",
    join: true,
    options: [
      "Samba Sima, un crack à suivre de très près.",
      "Samba Sima, un jeune phénomène comme on en voit rarement.",
      "Le crack Samba Sima confirme tout son talent.",
    ],
  };
}

/** Accroches gardées par le CM : ajoutées aux options d'accroche des modèles. */
function withSavedHooks(template: Template, saved: readonly string[]): Template {
  if (saved.length === 0) return template;
  return {
    ...template,
    segments: template.segments.map((s) =>
      s.block === "H" ? { ...s, options: [...s.options, ...saved] } : s,
    ),
  };
}

// ---------------------------------------------------------------------------
// Score d'un rendu
// ---------------------------------------------------------------------------

interface ScoringContext {
  recentHookWords: Set<string>[];
  profile?: StyleProfile;
  matchers: NameMatchers;
  references: readonly CopySource[];
}

function scoreComposition(
  composition: Composition,
  kind: VariantKind,
  target: number,
  scoring: ScoringContext,
): number | null {
  if (copyCheck(composition.text, scoring.references).copied) return null; // natif : on régénère
  const hookWords = wordSet(composition.hook);
  const hookSimilarity = Math.max(
    0,
    ...scoring.recentHookWords.map((words) => jaccard(hookWords, words)),
  );
  const words = ` ${tokenizeWords(composition.text).join(" ")} `;
  const pattern = hookPattern(composition.hook, scoring.matchers);
  const overused = (scoring.profile?.overused ?? []).some((o) =>
    o.expression.includes("{") ? o.expression === pattern : words.includes(` ${o.expression} `),
  );
  const lengthGap = Math.min(
    1,
    Math.abs(countGraphemes(composition.text) - target) / Math.max(1, target),
  );
  // Signature : légère préférence pour une accroche proche d'un patron fréquent du profil.
  const patternMatch =
    kind === "signature"
      ? Math.max(
          0,
          ...(scoring.profile?.hooks.patterns ?? []).map((p) =>
            jaccard(new Set(p.pattern.split(" ")), new Set(pattern.split(" "))),
          ),
        )
      : 0;
  return 1 - 0.4 * hookSimilarity - 0.3 * (overused ? 1 : 0) - 0.3 * lengthGap + 0.1 * patternMatch;
}

// ---------------------------------------------------------------------------
// Moteur
// ---------------------------------------------------------------------------

type CandidateSource = (kind: VariantKind, attempt: number) => Candidate[];

function bestEach(
  source: CandidateSource,
): Record<VariantKind, { candidate: Candidate; composition: Composition }> | null {
  const picks = DEFAULT_VARIANT_ORDER.map((kind) => [kind, source(kind, 0)[0]] as const);
  if (picks.some(([, candidate]) => !candidate)) return null;
  return Object.fromEntries(
    picks.map(([kind, candidate]) => [
      kind,
      { candidate: candidate!, composition: candidate!.composition },
    ]),
  ) as Record<VariantKind, { candidate: Candidate; composition: Composition }>;
}

/** Préparation commune à la génération et aux retouches : graine, candidats, finition. */
export interface NativeSource {
  seed: number;
  /** Meilleurs rendus d'une variante ; `only` restreint les modèles essayés. */
  candidatesFor(
    kind: VariantKind,
    attempt: number,
    only?: (template: Template) => boolean,
  ): Candidate[];
  /** Post-traitement d'un rendu retenu (section 10.7). */
  finalize(kind: VariantKind, composition: Composition, score: number): NativeVariant;
  /** Même post-traitement pour un texte transformé (retouches, déclinaisons). */
  processText(text: string, platform?: Platform): PostProcessResult;
}

export function prepareNative(input: NativeEngineInput): NativeSource {
  const { brief, category, context, style } = input;
  const seed = seedFor(brief, input.regenerationCount);
  const profileTop = style.profile?.emojis.top.map((e) => e.emoji) ?? [];
  const emojis = rankEmojis(category.id, profileTop);
  const order = profileOrder(style.profile, category.id);
  const samba = sambaSegment(input);
  const saved = (input.savedHooks ?? [])
    .filter((h) => h.mode === brief.mode && h.categoryId === category.id)
    .map((h) => h.pattern);
  const copy = copyFor(category.id);
  const finalQuestionBanned = input.rules.some(
    (r) => r.id === RULE_IDS.finalQuestion && r.enabled && r.values?.includes(category.id),
  );
  const questionAllowed =
    brief.mode === "daily" && Boolean(copy?.question) && !finalQuestionBanned && seed % 3 === 0;

  const scoring: ScoringContext = {
    recentHookWords: input.recentHooks.slice(0, 20).map(wordSet),
    profile: style.profile,
    matchers: compileNameMatchers(context.linkedFighters, []),
    references: input.references,
  };

  const candidatesFor = (
    kind: VariantKind,
    attempt: number,
    only?: (template: Template) => boolean,
  ): Candidate[] => {
    const target = lengthTarget(kind, style.params);
    const drop = new Set<SegmentRole>(OPTIONAL_ROLES);
    if (kind === "storytelling" && questionAllowed) drop.delete("question");
    if (context.vars.signature) drop.add("info"); // la signature porte déjà date et lieu
    const enrichedDrop = new Set(drop);
    enrichedDrop.delete("closing");

    // Rotation des emojis : chaque variante ne commence pas par le même.
    const offset = (DEFAULT_VARIANT_ORDER.indexOf(kind) + seed) % Math.max(1, emojis.length);
    const rotated = [...emojis.slice(offset), ...emojis.slice(0, offset)];
    const base = {
      vars: context.vars,
      emojis: rotated,
      emojiBudget: emojiBudget(kind, style.params, category.id),
      hashtagPosition: style.params.hashtagPosition,
      order: kind === "signature" ? order : undefined,
      extraSegments: samba ? [samba] : undefined,
    };

    const candidates: Candidate[] = [];
    const templates = templatesFor(category.id, kind).filter((t) => !only || only(t));
    for (const template of templates.map((t) => withSavedHooks(t, saved))) {
      const rngSeed = hashString(`${seed}:${kind}:${attempt}:${template.id}`);
      const composition = compose(template, { ...base, rng: createRng(rngSeed), dropRoles: drop });
      if (!composition) continue;
      const raw = scoreComposition(composition, kind, target, scoring);
      if (raw === null) continue;
      // Faits essentiels absents (ex. le vainqueur) : forte pénalité plutôt qu'exclusion.
      const text = normalizeText(composition.text);
      const missing = (copy?.mustMention ?? []).filter(
        (key) => context.vars[key] && !text.includes(normalizeText(context.vars[key]!)),
      ).length;
      // Départage déterministe (± 0,06) : une régénération explore aussi les autres modèles.
      const jitter = (createRng(hashString(`${rngSeed}:jitter`))() - 0.5) * 0.12;
      const score = raw - 0.5 * missing + jitter;
      const enriched =
        kind === "punchy"
          ? undefined
          : (compose(template, { ...base, rng: createRng(rngSeed), dropRoles: enrichedDrop }) ??
            undefined);
      candidates.push({ kind, composition, enriched, score, hookWords: wordSet(composition.hook) });
    }
    return candidates.sort((a, b) => b.score - a.score).slice(0, POOL);
  };

  const allowed = buildAllowedFacts([
    ...context.facts,
    ...(context.vars.hashtags?.split(" ") ?? []),
  ]);
  const processText = (text: string, platform: Platform = brief.platform): PostProcessResult =>
    postProcess(text, {
      lint: {
        rules: input.rules,
        categoryId: category.id,
        fields: brief.fields,
        frenchSpacing: input.frenchSpacing,
        emojiThreshold: style.params.emojiThreshold,
        recentHooks: input.recentHooks,
      },
      platform,
      allowed,
      vocabulary: TEMPLATE_VOCABULARY,
      broadcasters: input.broadcasters,
      references: input.references,
    });
  const finalize = (kind: VariantKind, composition: Composition, score: number): NativeVariant => {
    const processed = processText(composition.text);
    const paragraphs = processed.text.split(/\n\s*\n/).length;
    const blocks = processed.adapted
      ? collapseBlocks(composition.paragraphBlocks.slice(0, paragraphs))
      : composition.blocks;
    return {
      ...processed,
      kind,
      hook: processed.text.split("\n")[0] ?? "",
      structure: blocks.join("-"),
      templateId: composition.templateId,
      score: Math.round(score * 1000) / 1000,
    };
  };

  return { seed, candidatesFor, finalize, processText };
}

export function generateNative(input: NativeEngineInput): NativeResult {
  const started = performance.now();
  const { category } = input;
  const { seed, candidatesFor, finalize } = prepareNative(input);

  type Pick = Record<VariantKind, { candidate: Candidate; composition: Composition }>;
  const combine = (
    pools: Record<VariantKind, Candidate[]>,
    strictHooks: boolean,
  ): { pick: Pick; total: number } | null => {
    let best: { pick: Pick; total: number } | null = null;
    const similar = (a: Candidate, b: Candidate) =>
      jaccard(a.hookWords, b.hookWords) >= HOOK_SIMILARITY_LIMIT;
    for (const sig of pools.signature) {
      for (const pun of pools.punchy) {
        if (strictHooks && similar(sig, pun)) continue;
        const sigComposition =
          sig.composition.structure !== pun.composition.structure ? sig.composition : sig.enriched;
        if (!sigComposition || sigComposition.structure === pun.composition.structure) continue;
        for (const sto of pools.storytelling) {
          if (strictHooks && (similar(sto, sig) || similar(sto, pun))) continue;
          const taken = [sigComposition.structure, pun.composition.structure];
          const stoComposition = !taken.includes(sto.composition.structure)
            ? sto.composition
            : sto.enriched;
          if (!stoComposition || taken.includes(stoComposition.structure)) continue;
          const total = sig.score + pun.score + sto.score;
          if (!best || total > best.total) {
            best = {
              total,
              pick: {
                signature: { candidate: sig, composition: sigComposition },
                punchy: { candidate: pun, composition: pun.composition },
                storytelling: { candidate: sto, composition: stoComposition },
              },
            };
          }
        }
      }
    }
    return best;
  };

  let chosen: Pick | null = null;
  let fallback: Pick | null = null;
  let attempts = 0;
  for (let attempt = 0; attempt < MAX_ATTEMPTS && !chosen; attempt += 1) {
    attempts = attempt + 1;
    const pools = {
      signature: candidatesFor("signature", attempt),
      punchy: candidatesFor("punchy", attempt),
      storytelling: candidatesFor("storytelling", attempt),
    };
    chosen = combine(pools, true)?.pick ?? null;
    fallback ??= combine(pools, false)?.pick ?? null;
  }
  // Dernier repli : la meilleure proposition de chaque variante, sans contrainte croisée.
  const pick = chosen ?? fallback ?? bestEach(candidatesFor);
  if (!pick) {
    throw new Error(
      `Aucun modèle utilisable pour la catégorie « ${category.label} » avec ce brief.`,
    );
  }

  const variants = (input.variantOrder ?? DEFAULT_VARIANT_ORDER).map((kind) =>
    finalize(kind, pick[kind].composition, pick[kind].candidate.score),
  );

  return { variants, seed, attempts, durationMs: performance.now() - started };
}
