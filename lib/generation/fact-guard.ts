/**
 * Fact Guard (section 10.7, étape 3) : relève dans un texte les nombres, horaires, dates,
 * noms propres, diffuseurs et prix, et signale tout élément absent des faits autorisés
 * (brief, Session Live, fiches liées, signature, hashtags). Logique pure.
 *
 * Pour le moteur natif, un avertissement est un bug (test de propriété).
 * Pour une sortie IA, il est surligné avec « Information absente du brief : à vérifier ».
 */
import { normalizeText } from "@/lib/editorial/text-utils";
import { escapeRegex, hashtagRegex, mentionRegex, urlRegex } from "@/lib/editorial/text-utils";
import type { FactWarning } from "@/types/domain";

export type FactValue = string | number | boolean | null | undefined;

export interface AllowedFacts {
  /** Faits normalisés, séparés par « | » : sert aux correspondances sur plusieurs mots. */
  haystack: string;
  /** Mots normalisés présents dans les faits. */
  tokens: ReadonlySet<string>;
}

/** Diffuseurs reconnus même s'ils sont écrits en minuscules. */
export const KNOWN_BROADCASTERS = [
  "RMC Sport",
  "DAZN",
  "YouTube",
  "Canal+",
  "beIN Sports",
  "L'Équipe",
  "Prime Video",
  "Twitch",
  "TF1",
  "France 2",
  "France 3",
  "M6",
  "W9",
] as const;

/** Mots en capitales courants qui ne désignent ni une personne ni un fait. */
const COMMON_CAPS = new Set(["ko", "tko", "mma", "hexagone", "vs", "ok", "j", "r"]);

const DATE_WORDS =
  /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)$/;

/** Mot qui ne prolonge pas un nombre (« 2E » est un nombre, pas un nom). */
const WORD = /(?<![\p{L}\p{N}])[\p{L}][\p{L}\p{M}-]*/gu;
const DIGIT_TOKEN = /(?<![\p{L}\p{N}])[\p{L}]*\d[\p{L}\p{N}]*(?:[.,]\d+)?/gu;
const TIME =
  /(?<![\p{L}\p{N}])\d{1,2}\s?h\s?\d{0,2}(?![\p{L}\p{N}])|(?<![\p{L}\p{N}:])\d{1,2}:\d{2}(?![\p{N}])/giu;
const PRICE_AFTER = /^\s?(€|euros?\b)/iu;

function wordsOf(value: string): string[] {
  return normalizeText(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

export function buildAllowedFacts(values: Iterable<FactValue>): AllowedFacts {
  const strings = [...values]
    .filter((v): v is string | number => typeof v === "string" || typeof v === "number")
    .map(String)
    .filter((v) => v.trim() !== "");
  strings.push("HEXAGONE MMA");
  const tokens = new Set(strings.flatMap(wordsOf));
  // Une heure saisie « 20h30 » doit aussi autoriser « 20 h 30 » et inversement.
  for (const time of strings.join(" ").match(TIME) ?? []) tokens.add(compact(time));
  return { haystack: ` ${strings.map(normalizeText).join(" | ")} `, tokens };
}

const compact = (value: string) => normalizeText(value).replace(/\s+/g, "");

function isAllowedPhrase(phrase: string, allowed: AllowedFacts): boolean {
  const words = wordsOf(phrase);
  return words.length === 0 || words.every((word) => allowed.tokens.has(word));
}

/** Remplace hashtags, mentions et liens par des espaces, positions conservées. */
function blankIgnored(text: string): string {
  const blank = (match: string) => " ".repeat(match.length);
  return text
    .replace(urlRegex(), blank)
    .replace(hashtagRegex(), blank)
    .replace(mentionRegex(), blank);
}

/** Positions des débuts de phrase : début de ligne, après . ! ? … : et leurs ponctuations ouvrantes. */
const SENTENCE_START = new RegExp(
  '(^|\\n|[.!?…:»]\\s+)[\\s\\p{Extended_Pictographic}\\uFE0F\\u200D«"“(–—-]*',
  "gu",
);

function sentenceStarts(text: string): Set<number> {
  const starts = new Set<number>();
  for (const match of text.matchAll(SENTENCE_START)) starts.add(match.index + match[0].length);
  return starts;
}

export interface FactGuardOptions {
  allowed: AllowedFacts;
  /** Mots du texte fixe des modèles natifs : jamais des faits. */
  vocabulary?: ReadonlySet<string>;
  broadcasters?: readonly string[];
}

export function factGuard(text: string, options: FactGuardOptions): FactWarning[] {
  const { allowed, vocabulary } = options;
  const scanned = blankIgnored(text);
  const warnings: FactWarning[] = [];
  const covered: [number, number][] = [];
  const isCovered = (start: number) => covered.some(([s, e]) => start >= s && start < e);
  const push = (kind: FactWarning["kind"], value: string, start: number) => {
    warnings.push({ kind, value, start, end: start + value.length });
    covered.push([start, start + value.length]);
  };

  // Horaires.
  for (const m of scanned.matchAll(TIME)) {
    covered.push([m.index, m.index + m[0].length]);
    if (!allowed.tokens.has(compact(m[0])) && !isAllowedPhrase(m[0], allowed))
      push("time", m[0], m.index);
  }

  // Nombres (et prix).
  for (const m of scanned.matchAll(DIGIT_TOKEN)) {
    if (isCovered(m.index)) continue;
    const token = normalizeText(m[0]);
    if (allowed.tokens.has(token)) continue;
    const isPrice = PRICE_AFTER.test(scanned.slice(m.index + m[0].length));
    push(isPrice ? "price" : "number", m[0], m.index);
  }

  // Diffuseurs connus.
  for (const name of new Set([...KNOWN_BROADCASTERS, ...(options.broadcasters ?? [])])) {
    if (name.length < 2) continue;
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(name)}(?![\\p{L}\\p{N}])`, "giu");
    for (const m of scanned.matchAll(re)) {
      if (isCovered(m.index) || isAllowedPhrase(m[0], allowed)) continue;
      push("broadcaster", m[0], m.index);
    }
  }

  // Dates en toutes lettres, noms propres et mots en capitales.
  const starts = sentenceStarts(scanned);
  let group: { start: number; end: number } | null = null;
  const flushGroup = () => {
    if (!group) return;
    const value = scanned.slice(group.start, group.end);
    if (!isAllowedPhrase(value, allowed)) push("proper_noun", value, group.start);
    group = null;
  };

  for (const m of scanned.matchAll(WORD)) {
    const word = m[0];
    const start = m.index;
    if (isCovered(start)) {
      flushGroup();
      continue;
    }
    const normalized = normalizeText(word);
    if (DATE_WORDS.test(normalized)) {
      flushGroup();
      if (!allowed.tokens.has(normalized)) push("date", word, start);
      continue;
    }
    const letters = word.replace(/[^\p{L}]/gu, "");
    const isCaps =
      letters.length >= 2 && letters === letters.toUpperCase() && letters !== letters.toLowerCase();
    const isTitle = !isCaps && /^\p{Lu}/u.test(word) && !starts.has(start);
    const suspicious = isCaps
      ? !COMMON_CAPS.has(normalized) && !vocabulary?.has(normalized)
      : isTitle && !vocabulary?.has(normalized);

    if (!suspicious) {
      flushGroup();
      continue;
    }
    // Mots qui ressemblent à un nom : regroupés (« Karim Fictif », « LE MARTEAU »).
    const current = group as { start: number; end: number } | null;
    if (current && /^[\s-]$/.test(scanned.slice(current.end, start)))
      current.end = start + word.length;
    else {
      flushGroup();
      group = { start, end: start + word.length };
    }
  }
  flushGroup();

  return warnings.sort((a, b) => a.start - b.start);
}
