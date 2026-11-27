/**
 * Outils de texte du correcteur : bornes de mots compatibles avec les lettres accentuées,
 * zones jamais analysées (section 6.1), respect de la casse.
 */
import { emojiRegex, hashtagRegex, mentionRegex, urlRegex } from "@/lib/editorial/text-utils";

/** Début de mot (`\b` de JavaScript ignore les lettres accentuées). */
export const B = "(?<![\\p{L}\\p{N}_])";
/** Fin de mot. */
export const E = "(?![\\p{L}\\p{N}_])";
/** Espaces horizontaux, insécables compris (au moins un). */
export const S = "[ \\t\\u00A0\\u202F]+";
/** Apostrophe droite ou typographique. */
export const AP = "['’]";
/** Début de phrase : début de ligne (après emojis éventuels) ou après . ! ? suivi d'espaces. */
export const SENTENCE_START =
  "(?<=(?:^[ \\t\\u00A0\\p{Extended_Pictographic}\\uFE0F\\u200D]*)|(?:[.!?][ \\t\\u00A0\\u202F]+))";

/** Alternative de mots littéraux (échappés). */
export function alt(words: readonly string[]): string {
  return words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
}

/** Mot entier parmi une liste. */
export function word(words: readonly string[] | string): string {
  return `${B}(?:${typeof words === "string" ? words : alt(words)})${E}`;
}

export interface Range {
  start: number;
  end: number;
}

export function overlaps(a: Range, b: Range): boolean {
  return a.start < b.end && b.start < a.end;
}

/** Garde la casse de l'original : « Il » → « Il », « IL » → « IL ». */
export function keepCase(original: string, replacement: string): string {
  if (!replacement) return replacement;
  const letters = original.replace(/[^\p{L}]/gu, "");
  if (letters.length > 1 && letters === letters.toUpperCase() && letters !== letters.toLowerCase())
    return replacement.toUpperCase();
  const first = original.charAt(0);
  if (first && first === first.toUpperCase() && first !== first.toLowerCase())
    return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
}

function collect(text: string, re: RegExp, into: Range[]) {
  for (const m of text.matchAll(re)) into.push({ start: m.index, end: m.index + m[0].length });
}

/** Citations entre guillemets (« … » ou "…"), protégées pour « Réaction combattant ». */
const QUOTES = /«[^»]*»|"[^"\n]*"|“[^”]*”/gu;

/** Zones jamais analysées : liens, hashtags, mentions, emojis, citations éventuelles. */
export function protectedRanges(text: string, protectQuotes = false): Range[] {
  const ranges: Range[] = [];
  collect(text, urlRegex(), ranges);
  collect(text, hashtagRegex(), ranges);
  collect(text, mentionRegex(), ranges);
  collect(text, emojiRegex(), ranges);
  if (protectQuotes) collect(text, QUOTES, ranges);
  return ranges;
}

/** Occurrences des mots du dictionnaire (insensible à la casse, mots entiers). */
export function dictionaryRanges(text: string, dictionary?: ReadonlySet<string>): Range[] {
  if (!dictionary || dictionary.size === 0) return [];
  const ranges: Range[] = [];
  const lower = text.toLowerCase();
  for (const entry of dictionary) {
    if (!entry) continue;
    let from = 0;
    for (;;) {
      const at = lower.indexOf(entry, from);
      if (at < 0) break;
      const before = at === 0 ? "" : lower.charAt(at - 1);
      const after = lower.charAt(at + entry.length);
      if (!/[\p{L}\p{N}_]/u.test(before) && !/[\p{L}\p{N}_]/u.test(after))
        ranges.push({ start: at, end: at + entry.length });
      from = at + entry.length;
    }
  }
  return ranges;
}

/** Mots du texte avec leur position (lettres, chiffres, apostrophes et traits d'union internes). */
export function wordsWithPositions(text: string): { word: string; start: number; end: number }[] {
  const out: { word: string; start: number; end: number }[] = [];
  for (const m of text.matchAll(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu)) {
    out.push({ word: m[0], start: m.index, end: m.index + m[0].length });
  }
  return out;
}
