/**
 * Brand Voice Extractor (section 8) : transforme la bibliothèque d'un mode en profil
 * de style mesuré. Tout est calculé à partir des publications, rien n'est supposé.
 * Les deux modes sont toujours analysés séparément. Logique pure.
 */
import { newId } from "@/lib/database/hash";
import type {
  Fighter,
  HexEvent,
  Mode,
  Ngram,
  Signature,
  StyleProfile,
  Wording,
} from "@/types/domain";
import { detectCta } from "./cta";
import { compileNameMatchers, hookPattern, maskNames, type NameMatchers } from "./hook-pattern";
import { DEFAULT_CTA_LEXICON } from "./rules";
import { countBy, mean, median, percentile, ratio, round } from "./stats";
import { isStopword } from "./stopwords-fr";
import { structureFingerprint, type StructureContext } from "./structure";
import {
  contentLines,
  countGraphemes,
  emojiRegex,
  extractHook,
  hashtagRegex,
  isHashtagLine,
  listEmojis,
  mentionRegex,
  splitParagraphs,
  splitSentences,
  startsWithEmoji,
  tokenizeWords,
  urlRegex,
} from "./text-utils";

/** Seuil d'une expression « À varier » et taille de corpus minimale (section 8.6). */
export const OVERUSED_SHARE = 0.25;
export const OVERUSED_MIN_CORPUS = 15;
const TOP = {
  emojis: 15,
  hashtags: 15,
  ngrams: 15,
  vocabulary: 30,
  patterns: 15,
  ctas: 10,
  structures: 10,
};

export interface StyleExtractionInput {
  mode: Mode;
  /** Bibliothèque complète : le corpus est filtré ici. */
  wordings: readonly Wording[];
  fighters?: readonly Fighter[];
  events?: readonly HexEvent[];
  signatures?: readonly Signature[];
  ctaLexicon?: readonly string[];
  broadcasters?: readonly string[];
  /** Option explicite de l'interface : inclure les exemples fictifs. */
  includeDemo?: boolean;
  now?: Date;
  id?: string;
}

/** Corpus : publications du mode, références réelles, et les démos seulement sur demande. */
export function selectCorpus(
  wordings: readonly Wording[],
  mode: Mode,
  includeDemo = false,
): Wording[] {
  return wordings.filter(
    (w) => w.mode === mode && ((w.isReference && !w.isDemo) || (includeDemo && w.isDemo)),
  );
}

export function confidenceFor(size: number): StyleProfile["confidence"] {
  if (size < 5) return "insufficient";
  if (size < 15) return "low";
  if (size < 50) return "medium";
  return "high";
}

// ---------------------------------------------------------------------------
// Indicateurs
// ---------------------------------------------------------------------------

function lengthStats(texts: string[]): StyleProfile["length"] {
  const chars = texts.map(countGraphemes);
  return {
    charsMean: round(mean(chars)),
    charsMedian: round(median(chars)),
    charsP90: round(percentile(chars, 90)),
    linesMedian: round(median(texts.map((t) => contentLines(t).length))),
    paragraphsMedian: round(median(texts.map((t) => splitParagraphs(t).length))),
  };
}

function emojiStats(texts: string[]): StyleProfile["emojis"] {
  const perPost = texts.map(listEmojis);
  const all = perPost.flat();
  const docs = countBy(
    perPost.flatMap((list) => [...new Set(list)]),
    (e) => e,
  );
  const lines = texts.flatMap(contentLines);
  return {
    top: [...countBy(all, (e) => e).entries()].slice(0, TOP.emojis).map(([emoji, { count }]) => ({
      emoji,
      count,
      share: round(ratio(docs.get(emoji)?.count ?? 0, texts.length), 3),
    })),
    perPostMedian: round(median(perPost.map((l) => l.length))),
    perPostP90: round(
      percentile(
        perPost.map((l) => l.length),
        90,
      ),
    ),
    lineStartRatio: round(ratio(lines.filter(startsWithEmoji).length, lines.length), 3),
  };
}

function hashtagPosition(text: string): "end" | "inline" | "mixed" | null {
  const lines = contentLines(text);
  const total = text.match(hashtagRegex())?.length ?? 0;
  if (total === 0) return null;
  let trailing = 0;
  for (let i = lines.length - 1; i >= 0 && isHashtagLine(lines[i] ?? ""); i -= 1) {
    trailing += lines[i]?.match(hashtagRegex())?.length ?? 0;
  }
  if (trailing === total) return "end";
  return trailing === 0 ? "inline" : "mixed";
}

function hashtagStats(texts: string[]): StyleProfile["hashtags"] {
  const perPost = texts.map((t) => t.match(hashtagRegex()) ?? []);
  const counts = countBy(perPost.flat(), (tag) => tag.toLowerCase());
  const positions = texts.map(hashtagPosition).filter((p) => p !== null);
  const share = (p: string) => ratio(positions.filter((x) => x === p).length, positions.length);
  const position =
    positions.length === 0 || share("end") >= 0.8
      ? "end"
      : share("inline") >= 0.8
        ? "inline"
        : "mixed";
  return {
    top: [...counts.values()]
      .slice(0, TOP.hashtags)
      .map(({ item, count }) => ({ tag: item, count })),
    perPostMedian: round(median(perPost.map((tags) => tags.length))),
    position,
  };
}

const BRAND_WORDS = /HEXAGONE|MMA/g;

function isShouted(text: string): boolean {
  const letters = text.replace(BRAND_WORDS, "").replace(/[^\p{L}]/gu, "");
  if (letters.length < 4) return false;
  return ratio(letters.replace(/[^\p{Lu}]/gu, "").length, letters.length) >= 0.6;
}

function hookStats(
  corpus: Wording[],
  matchers: NameMatchers,
): {
  hooks: StyleProfile["hooks"];
  patternShares: Map<string, number>;
} {
  const hooks = corpus
    .map((w) => ({ wording: w, hook: extractHook(w.text)?.text ?? "" }))
    .filter((h) => h.hook);
  const patterns = countBy(
    hooks.map((h) => hookPattern(h.hook, matchers)),
    (p) => p,
  );
  const recent = [...hooks].sort((a, b) =>
    (b.wording.date ?? b.wording.createdAt).localeCompare(a.wording.date ?? a.wording.createdAt),
  );
  return {
    hooks: {
      samples: recent.slice(0, 8).map((h) => h.hook),
      patterns: [...patterns.entries()]
        .filter(([, { count }]) => count >= 2)
        .slice(0, TOP.patterns)
        .map(([pattern, { count }]) => ({ pattern, count })),
      uppercaseRatio: round(ratio(hooks.filter((h) => isShouted(h.hook)).length, hooks.length), 3),
      exclamationRatio: round(
        ratio(hooks.filter((h) => h.hook.includes("!")).length, hooks.length),
        3,
      ),
      questionRatio: round(
        ratio(hooks.filter((h) => h.hook.includes("?")).length, hooks.length),
        3,
      ),
      avgWords: round(mean(hooks.map((h) => tokenizeWords(h.hook).length))),
    },
    patternShares: new Map(
      [...patterns.entries()].map(([pattern, { count }]) => [pattern, ratio(count, corpus.length)]),
    ),
  };
}

/** Segments de mots consécutifs : noms connus, nombres, emojis, liens et ponctuation coupent. */
function wordSegments(text: string, matchers: NameMatchers): string[][] {
  const segments: string[][] = [];
  for (const sentence of splitSentences(text)) {
    if (isHashtagLine(sentence)) continue;
    const cut = maskNames(sentence, matchers)
      .replace(/\{(NOM|EVENT)\}/g, "|")
      .replace(urlRegex(), "|")
      .replace(hashtagRegex(), "|")
      .replace(mentionRegex(), "|")
      .replace(emojiRegex(), "|");
    for (const part of cut.split(/[|,;:()«»"“”–—]/)) {
      let current: string[] = [];
      for (const word of tokenizeWords(part)) {
        if (/\d/.test(word)) {
          if (current.length) segments.push(current);
          current = [];
        } else current.push(word);
      }
      if (current.length) segments.push(current);
    }
  }
  return segments;
}

interface GramCount {
  count: number;
  docs: number;
}

function ngramStats(segmentsByPost: string[][][], corpusSize: number) {
  const grams: Record<2 | 3 | 4, Map<string, GramCount>> = {
    2: new Map(),
    3: new Map(),
    4: new Map(),
  };
  for (const segments of segmentsByPost) {
    const seen = new Set<string>();
    for (const segment of segments) {
      for (const n of [2, 3, 4] as const) {
        for (let i = 0; i + n <= segment.length; i += 1) {
          const words = segment.slice(i, i + n);
          // Une expression utile ne commence ni ne finit par un mot vide (« ko de », « a la fin »).
          if (isStopword(words[0]!) || isStopword(words[n - 1]!)) continue;
          const text = words.join(" ");
          const entry = grams[n].get(text) ?? { count: 0, docs: 0 };
          entry.count += 1;
          if (!seen.has(text)) {
            entry.docs += 1;
            seen.add(text);
          }
          grams[n].set(text, entry);
        }
      }
    }
  }
  const top = (n: 2 | 3 | 4): Ngram[] =>
    [...grams[n].entries()]
      .filter(([, g]) => g.docs >= 2)
      .sort((a, b) => b[1].docs - a[1].docs || b[1].count - a[1].count)
      .slice(0, TOP.ngrams)
      .map(([text, g]) => ({ text, count: g.count, share: round(ratio(g.docs, corpusSize), 3) }));
  const shares = new Map<string, number>();
  for (const n of [2, 3, 4] as const) {
    for (const [text, g] of grams[n]) shares.set(text, ratio(g.docs, corpusSize));
  }
  return { ngrams: { bigrams: top(2), trigrams: top(3), quadgrams: top(4) }, shares };
}

/**
 * Retire les expressions redondantes : contenues dans une expression gardée, ou chevauchant
 * (deux mots consécutifs en commun) une expression de même fréquence.
 * Les plus fréquentes, puis les plus longues, sont gardées en priorité.
 */
export function collapseExpressions<T extends { text: string; share: number }>(
  items: readonly T[],
): T[] {
  const sorted = [...items].sort(
    (a, b) => b.share - a.share || b.text.split(" ").length - a.text.split(" ").length,
  );
  const kept: T[] = [];
  for (const item of sorted) {
    const words = item.text.split(" ");
    const pairs = words.slice(1).map((word, i) => `${words[i]} ${word}`);
    const redundant = kept.some(
      (other) =>
        ` ${other.text} `.includes(` ${item.text} `) ||
        (Math.abs(other.share - item.share) < 1e-9 &&
          pairs.some((pair) => ` ${other.text} `.includes(` ${pair} `))),
    );
    if (!redundant) kept.push(item);
  }
  return kept;
}

/**
 * Phrases entières répétées (4 mots au moins, hors accroche), part de posts qui les contiennent.
 * Une phrase répétée est signalée d'un bloc plutôt qu'en fragments de n-grammes.
 */
function sentenceShares(corpus: Wording[], matchers: NameMatchers): Map<string, number> {
  const docs = new Map<string, number>();
  for (const w of corpus) {
    const seen = new Set<string>();
    const [, ...body] = contentLines(w.text); // la première ligne est l'accroche (patrons)
    for (const sentence of splitSentences(body.join("\n"))) {
      if (isHashtagLine(sentence)) continue;
      const words = tokenizeWords(maskNames(sentence, matchers).replace(/\{(NOM|EVENT)\}/g, " "));
      if (words.length < 4 || words.some((word) => /\d/.test(word))) continue;
      seen.add(words.join(" "));
    }
    for (const key of seen) docs.set(key, (docs.get(key) ?? 0) + 1);
  }
  return new Map([...docs].map(([key, count]) => [key, ratio(count, corpus.length)]));
}

/** Expressions présentes dans plus de 25 % des posts, sur un corpus d'au moins 15 posts (section 8.6). */
function overusedExpressions(
  corpusSize: number,
  sentences: Map<string, number>,
  ngramShares: Map<string, number>,
  patternShares: Map<string, number>,
): StyleProfile["overused"] {
  if (corpusSize < OVERUSED_MIN_CORPUS) return [];
  const above = (shares: Map<string, number>) =>
    [...shares.entries()]
      .filter(([, share]) => share > OVERUSED_SHARE)
      .map(([text, share]) => ({ text, share }));
  const expressions = collapseExpressions([...above(sentences), ...above(ngramShares)]);
  return [...expressions, ...above(patternShares)]
    .sort((a, b) => b.share - a.share)
    .slice(0, 20)
    .map(({ text, share }) => ({ expression: text, share: round(share, 3) }));
}

function rankedByCategory<T extends { categoryId?: string }>(
  corpus: Wording[],
  valueOf: (w: Wording) => string | null,
  build: (value: string, count: number, categoryId?: string) => T,
  limits: { global: number; perCategory: number },
): T[] {
  const entries = corpus
    .map((w) => ({ value: valueOf(w), categoryId: w.categoryId }))
    .filter((e): e is { value: string; categoryId: string } => e.value !== null);
  const global = [...countBy(entries, (e) => e.value).values()]
    .slice(0, limits.global)
    .map(({ item, count }) => build(item.value, count));
  const byCategory = [...new Set(entries.map((e) => e.categoryId))].flatMap((categoryId) =>
    [
      ...countBy(
        entries.filter((e) => e.categoryId === categoryId),
        (e) => e.value,
      ).values(),
    ]
      .slice(0, limits.perCategory)
      .map(({ item, count }) => build(item.value, count, categoryId)),
  );
  return [...global, ...byCategory];
}

function punctuationStats(texts: string[]): StyleProfile["punctuation"] {
  const words = texts.flatMap((t) =>
    t
      .split(/\s+/)
      .map((w) => w.replace(/[^\p{L}]/gu, ""))
      .filter((w) => w.length >= 2),
  );
  const shouted = words.filter(
    (w) =>
      w.length > 3 && w === w.toUpperCase() && w !== w.toLowerCase() && !/^(HEXAGONE|MMA)$/.test(w),
  );
  return {
    exclamationPerPost: round(mean(texts.map((t) => t.match(/!/g)?.length ?? 0))),
    ellipsisPerPost: round(mean(texts.map((t) => t.match(/…|\.\.\./g)?.length ?? 0))),
    uppercaseWordRatio: round(ratio(shouted.length, words.length), 3),
  };
}

// ---------------------------------------------------------------------------
// Profil complet
// ---------------------------------------------------------------------------

export function buildStyleProfile(input: StyleExtractionInput): StyleProfile {
  const corpus = selectCorpus(input.wordings, input.mode, input.includeDemo);
  const texts = corpus.map((w) => w.text);
  const matchers = compileNameMatchers(input.fighters, input.events);
  const structureContext: StructureContext = {
    signatures: input.signatures,
    ctaLexicon: input.ctaLexicon ?? DEFAULT_CTA_LEXICON,
    broadcasters: input.broadcasters,
  };

  const { hooks, patternShares } = hookStats(corpus, matchers);
  const segmentsByPost = texts.map((t) => wordSegments(t, matchers));
  const { ngrams, shares } = ngramStats(segmentsByPost, corpus.length);
  const vocabulary = countBy(
    segmentsByPost.flat(2).filter((w) => w.length >= 3 && !isStopword(w)),
    (w) => w,
  );

  return {
    id: input.id ?? newId(),
    mode: input.mode,
    createdAt: (input.now ?? new Date()).toISOString(),
    corpusSize: corpus.length,
    corpusIds: corpus.map((w) => w.id),
    includesDemo: Boolean(input.includeDemo) && corpus.some((w) => w.isDemo),
    confidence: confidenceFor(corpus.length),
    status: "proposed",
    length: lengthStats(texts),
    emojis: emojiStats(texts),
    hashtags: hashtagStats(texts),
    hooks,
    ctas: {
      top: rankedByCategory(
        corpus,
        (w) => detectCta(w.text, structureContext.ctaLexicon),
        (text, count, categoryId) => ({ text, count, ...(categoryId ? { categoryId } : {}) }),
        { global: TOP.ctas, perCategory: 3 },
      ),
    },
    ngrams,
    vocabulary: {
      top: [...vocabulary.entries()]
        .slice(0, TOP.vocabulary)
        .map(([word, { count }]) => ({ word, count })),
    },
    structures: rankedByCategory(
      corpus,
      (w) => structureFingerprint(w.text, structureContext) || null,
      (fingerprint, count, categoryId) => ({
        fingerprint,
        count,
        ...(categoryId ? { categoryId } : {}),
      }),
      { global: TOP.structures, perCategory: 3 },
    ),
    overused: overusedExpressions(
      corpus.length,
      sentenceShares(corpus, matchers),
      shares,
      patternShares,
    ),
    punctuation: punctuationStats(texts),
  };
}
