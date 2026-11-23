/**
 * Classifieur de publications (section 14.3) : règles par mots-clés et emojis pondérés,
 * puis, quand la bibliothèque compte au moins 30 publications catégorisées, le vote des
 * publications les plus proches (BM25). Renvoie catégorie, mode et confiance ; sous 0,4,
 * la publication est « À catégoriser ». Logique pure.
 */
import { getCategory } from "@/lib/categories/registry";
import { normalizeText } from "@/lib/editorial/text-utils";
import { Bm25Index } from "@/lib/retrieval/index";
import { tokenize } from "@/lib/retrieval/tokenizer";
import type { Mode } from "@/types/domain";

export const CONFIDENCE_THRESHOLD = 0.4;
export const BM25_MIN_CORPUS = 30;

/** `raw` : motif testé sur le texte brut (emojis), sinon sur le texte normalisé. */
type Rule = readonly [pattern: RegExp, weight: number, raw: boolean];

/** Sélecteur de variante : « ⚖️ » et « ⚖ » sont le même emoji. */
const VARIATION = String.fromCodePoint(0xfe0f);
const stripVariation = (value: string) => value.split(VARIATION).join("");

const w = (source: string, weight: number): Rule => [new RegExp(source, "u"), weight, false];
const e = (emojis: string, weight: number): Rule => [
  new RegExp(
    `(${[...new Intl.Segmenter().segment(stripVariation(emojis))].map((s) => s.segment).join("|")})`,
    "u",
  ),
  weight,
  true,
];

const RULES: Readonly<Record<string, readonly Rule[]>> = {
  live_ko: [
    w("\\b(ko|k\\.o|tko)\\b", 3),
    w("arret de l'arbitre|hors de combat", 1.5),
    e("💥", 1.5),
  ],
  live_sub: [
    w("soumission|etranglement|guillotine|cle de bras|triangle|kimura|tape", 3),
    e("🐍", 1.5),
  ],
  live_decision: [
    w("decision (unanime|partagee|majoritaire)|aux points|les juges", 3),
    e("⚖️", 1.5),
  ],
  live_result: [w("victoire|s'impose|remporte|vainqueur", 1.5), e("🏆", 1)],
  live_walkout: [w("fait son entree|entree (dans la cage|en scene)|walkout", 3), e("🚶", 1.5)],
  live_crowd: [
    w("ambiance", 2),
    w("le public", 1.5),
    w("la salle (est|explose|chauffe|vibre)", 1.5),
  ],
  live_faceoff: [w("face[- ]off|face a face", 2)],
  live_champion: [
    w("nouveau champion|nouvelle championne|s'empare de la ceinture|decroche la ceinture", 3),
    e("🥇🏅", 1.5),
  ],
  live_defense: [
    w("conserve (sa|la) ceinture|defend (son|sa)|defense (de|du) titre", 3),
    e("🛡️", 1.5),
  ],
  live_defeat: [w("defaite|s'incline|revers|la revanche", 3), e("❌", 1)],
  live_reaction: [w("reaction|au micro|a chaud", 2.5), e("🎤", 1)],
  live_moment: [w("moment fort|l'instant|highlight|ralenti", 2.5), e("🎬", 1)],
  daily_fight_announce: [
    w("combat (officiel|annonce)|affrontera|s'affronteront|nouveau combat", 3),
    e("📢", 1),
  ],
  daily_fighter_intro: [w("decouvrez|qui est|presentation de|faites connaissance", 2.5)],
  daily_fight_card: [w("carte (complete|des combats)|fight card|main card", 3)],
  daily_main_event: [w("main event|tete d'affiche|combat principal", 3)],
  daily_faceoff: [w("conference de presse|pesee|face[- ]off", 2)],
  daily_sport_news: [w("blessure|forfait|remplacant|changement de combat", 3)],
  daily_retro: [w("retour sur|il y a (un an|\\d+ ans)|souvenir|flashback|#tbt", 3)],
  daily_ticketing: [w("billetterie|billets|reservez|prenez vos places", 3), e("🎟️🎫", 1.5)],
  daily_countdown: [w("\\bj-\\d+\\b|compte a rebours|plus que \\d+ jours", 3), e("⏳", 1.5)],
  daily_event_announce: [
    w("prochain evenement|nouvel evenement|date (officielle|annoncee)|rendez-vous le", 2.5),
    e("📅🗓️", 1),
  ],
  daily_fight_week: [w("fight week|semaine du combat", 3)],
  daily_program: [w("programme|horaires|planning|deroule de la journee", 2.5)],
  daily_last_seats: [
    w("dernieres places|derniers billets|presque complet|sold out|guichets fermes", 3.5),
  ],
  media_press: [w("article|la presse|a lire|parution", 2.5), e("📰", 1.5)],
  media_interview: [w("interview|entretien|au micro de", 3), e("🎙️", 1.5)],
  media_tv: [w("television|plateau tele|emission|sur le plateau", 2.5), e("📺", 1)],
  media_radio: [w("\\bradio\\b|a l'antenne", 3), e("📻", 1.5)],
  media_podcast: [w("podcast|episode", 3), e("🎧", 1.5)],
  media_youtube: [w("youtube|nouvelle video|la video", 3), e("▶️", 1)],
  media_portrait: [w("portrait|parcours de", 2.5)],
  media_fighter_news: [w("dans les medias|a ete invite|invite de", 2.5)],
  comm_partner: [w("partenaire|partenariat|sponsor", 3), e("🤝", 1)],
  comm_news: [w("actualite de la ligue|nouvelle importante|information importante", 2.5)],
  comm_statement: [w("communique|la ligue (precise|informe)|nous tenons a", 3)],
  comm_thanks: [w("\\bmerci\\b|remerciements|gratitude", 2), e("🙏", 1)],
  comm_institutional: [w("federation|reglement|nos valeurs|engagement", 2.5)],
};

const LIVE_MARKERS = /\bce soir\b|en direct|dans la cage|\br\d\b|\bround\b/u;

export interface Classification {
  categoryId?: string;
  mode: Mode;
  /** 0 à 1 ; sous 0,4 : « À catégoriser ». */
  confidence: number;
  needsReview: boolean;
}

export interface CorpusEntry {
  id: string;
  text: string;
  categoryId: string;
  isDemo?: boolean;
}

function keywordScores(text: string): Map<string, number> {
  const normalized = normalizeText(text);
  const raw = stripVariation(text);
  const scores = new Map<string, number>();
  for (const [categoryId, rules] of Object.entries(RULES)) {
    let total = 0;
    for (const [pattern, weight, isRaw] of rules) {
      if (pattern.test(isRaw ? raw : normalized)) total += weight;
    }
    if (total > 0) scores.set(categoryId, total);
  }
  // « Ce soir », la cage, un round : léger avantage aux catégories LIVE déjà évoquées.
  if (LIVE_MARKERS.test(normalized)) {
    for (const [categoryId, score] of scores) {
      if (getCategory(categoryId)?.mode === "live") scores.set(categoryId, score + 1);
    }
  }
  return scores;
}

/**
 * Classifieur prêt à l'emploi. `corpus` : publications déjà catégorisées de la bibliothèque
 * (les exemples fictifs sont ignorés) ; utilisé à partir de 30.
 */
export function createClassifier(corpus: readonly CorpusEntry[] = []) {
  const real = corpus.filter((c) => !c.isDemo && getCategory(c.categoryId));
  const categories = new Map(real.map((c) => [c.id, c.categoryId]));
  const index = real.length >= BM25_MIN_CORPUS ? new Bm25Index() : undefined;
  for (const entry of index ? real : []) index!.upsert(entry.id, tokenize(entry.text));

  return function classify(text: string): Classification {
    const scores = keywordScores(text);
    if (index) {
      const ranked = [...index.score(tokenize(text)).entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);
      const top = ranked[0]?.[1] ?? 0;
      for (const [id, score] of ranked) {
        const categoryId = categories.get(id)!;
        scores.set(categoryId, (scores.get(categoryId) ?? 0) + (top > 0 ? (2 * score) / top : 0));
      }
    }
    const ordered = [...scores.entries()].sort((a, b) => b[1] - a[1]);
    const [best, second] = ordered;
    const live = LIVE_MARKERS.test(normalizeText(text));
    if (!best) return { mode: live ? "live" : "daily", confidence: 0, needsReview: true };
    const confidence = Math.round((best[1] / (best[1] + (second?.[1] ?? 0) + 2)) * 100) / 100;
    return {
      categoryId: best[0],
      mode: getCategory(best[0])!.mode,
      confidence,
      needsReview: confidence < CONFIDENCE_THRESHOLD,
    };
  };
}

export type Classify = ReturnType<typeof createClassifier>;
