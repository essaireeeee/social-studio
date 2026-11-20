/**
 * Score pondéré d'une référence (section 9.1). Logique pure.
 *
 *   score = 0.30 × même catégorie (1, ou 0,5 si catégorie voisine)
 *         + 0.20 × part des combattants du brief présents dans le post
 *         + 0.10 × même événement
 *         + 0.25 × similarité texte (BM25 normalisé)
 *         + 0.10 × même plateforme
 *         + 0.05 × fraîcheur (exp(-âge en jours / 365))
 *         − 0.15 × déjà utilisée dans les 5 dernières générations
 *
 * Les poids viennent des réglages (`Settings.retrievalWeights`).
 */
import { categoryProximity } from "@/lib/categories/registry";
import { escapeRegex, normalizeText } from "@/lib/editorial/text-utils";
import type { Platform, RetrievalWeights, Wording } from "@/types/domain";

export type ScoreComponent = keyof RetrievalWeights;

export type ScoreBreakdown = Record<ScoreComponent, number>;

/** Libellés des composantes du score, pour le détail d'une référence. */
export const SCORE_COMPONENT_LABELS: Record<ScoreComponent, string> = {
  sameCategory: "Catégorie",
  fighterOverlap: "Combattants",
  sameEvent: "Événement",
  textSimilarity: "Similarité du texte",
  samePlatform: "Plateforme",
  recency: "Fraîcheur",
  usedRecently: "Déjà utilisée récemment",
};

/** Entité du brief recherchée dans les posts : fiche liée et/ou noms à retrouver dans le texte. */
export interface EntityMatcher {
  id?: string;
  names: string[];
}

export interface ScoringContext {
  categoryId: string;
  platform: Platform;
  fighters: readonly EntityMatcher[];
  event?: EntityMatcher;
  recentlyUsed: ReadonlySet<string>;
  weights: RetrievalWeights;
  now: Date;
}

const DAY_MS = 86_400_000;

const nameRegexCache = new Map<string, RegExp | null>();

/** Nom recherché dans le texte normalisé, délimité comme un mot (« Testeur, » compte). */
function nameRegex(name: string): RegExp | null {
  let cached = nameRegexCache.get(name);
  if (cached === undefined) {
    const needle = normalizeText(name);
    cached =
      needle.length >= 3
        ? new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(needle)}(?![\\p{L}\\p{N}])`, "u")
        : null;
    if (nameRegexCache.size > 500) nameRegexCache.clear();
    nameRegexCache.set(name, cached);
  }
  return cached;
}

function mentions(wording: Wording, names: readonly string[]): boolean {
  return names.some((name) => nameRegex(name)?.test(wording.textNormalized) ?? false);
}

function matches(wording: Wording, entity: EntityMatcher, linkedIds: readonly string[]): boolean {
  return (
    (entity.id !== undefined && linkedIds.includes(entity.id)) || mentions(wording, entity.names)
  );
}

export function fighterOverlap(wording: Wording, fighters: readonly EntityMatcher[]): number {
  if (fighters.length === 0) return 0;
  return fighters.filter((f) => matches(wording, f, wording.fighterIds)).length / fighters.length;
}

export function recency(wording: Wording, now: Date): number {
  const date = Date.parse(wording.date ?? wording.createdAt);
  const ageDays = Math.max(0, (now.getTime() - date) / DAY_MS);
  return Math.exp(-ageDays / 365);
}

/** Valeurs brutes (0 à 1) de chaque composante, avant pondération. */
export function rawComponents(
  wording: Wording,
  textSimilarity: number,
  context: ScoringContext,
): ScoreBreakdown {
  return {
    sameCategory: categoryProximity(context.categoryId, wording.categoryId),
    fighterOverlap: fighterOverlap(wording, context.fighters),
    sameEvent:
      context.event && matches(wording, context.event, wording.eventId ? [wording.eventId] : [])
        ? 1
        : 0,
    textSimilarity,
    samePlatform: wording.platform === context.platform ? 1 : 0,
    recency: recency(wording, context.now),
    usedRecently: context.recentlyUsed.has(wording.id) ? 1 : 0,
  };
}

/** Contributions pondérées ; la pénalité « déjà utilisée » est négative. */
export function weighted(raw: ScoreBreakdown, weights: RetrievalWeights): ScoreBreakdown {
  return {
    sameCategory: raw.sameCategory * weights.sameCategory,
    fighterOverlap: raw.fighterOverlap * weights.fighterOverlap,
    sameEvent: raw.sameEvent * weights.sameEvent,
    textSimilarity: raw.textSimilarity * weights.textSimilarity,
    samePlatform: raw.samePlatform * weights.samePlatform,
    recency: raw.recency * weights.recency,
    usedRecently: -raw.usedRecently * weights.usedRecently,
  };
}

export function total(contributions: ScoreBreakdown): number {
  return Object.values(contributions).reduce((sum, value) => sum + value, 0);
}

/** Raison affichée : la composante qui contribue le plus au score. */
export function mainReason(
  raw: ScoreBreakdown,
  contributions: ScoreBreakdown,
  fighterCount: number,
): string {
  const positive = (Object.entries(contributions) as [ScoreComponent, number][])
    .filter(([key, value]) => key !== "usedRecently" && value > 0)
    .sort((a, b) => b[1] - a[1]);
  const best = positive[0]?.[0];
  switch (best) {
    case "sameCategory":
      return raw.sameCategory === 1 ? "Même catégorie" : "Catégorie voisine";
    case "fighterOverlap":
      return fighterCount > 1 && raw.fighterOverlap === 1 ? "Mêmes combattants" : "Même combattant";
    case "sameEvent":
      return "Même événement";
    case "textSimilarity":
      return "Contenu proche";
    case "samePlatform":
      return "Même plateforme";
    case "recency":
      return "Publication récente";
    default:
      return "Même univers";
  }
}
