/**
 * Détection des appels à l'action (section 8.7) : deux dernières lignes hors hashtags,
 * par lexique éditable ou verbe à l'impératif en tête de ligne.
 */
import { DEFAULT_CTA_LEXICON } from "./rules";
import {
  contentLines,
  emojiRegex,
  isHashtagLine,
  normalizeText,
  tokenizeWords,
} from "./text-utils";

/** Impératifs fréquents qui ne finissent pas en « -ez ». */
const IMPERATIVE_WORDS = new Set([
  "viens",
  "rejoins",
  "fonce",
  "regarde",
  "decouvre",
  "retrouve",
  "partage",
  "commente",
  "abonne",
  "tente",
]);
/** Mots en « -ez » qui ne sont pas des verbes. */
const NOT_IMPERATIVE = new Set(["chez", "assez", "nez", "rez"]);

export function startsWithImperative(line: string): boolean {
  const first = tokenizeWords(line)[0];
  if (!first || NOT_IMPERATIVE.has(first)) return false;
  return (first.length > 3 && first.endsWith("ez")) || IMPERATIVE_WORDS.has(first);
}

export function isCtaLine(line: string, lexicon: readonly string[] = DEFAULT_CTA_LEXICON): boolean {
  const normalized = normalizeText(line);
  return (
    lexicon.some((term) => normalized.includes(normalizeText(term))) || startsWithImperative(line)
  );
}

/** Texte d'un CTA, sans emojis ni espaces superflus. */
export function cleanCta(line: string): string {
  return line.replace(emojiRegex(), " ").replace(/\s+/g, " ").trim();
}

/** Les deux dernières lignes de contenu (hors lignes de hashtags), dans l'ordre. */
export function lastTwoContentLines(text: string): string[] {
  return contentLines(text)
    .filter((line) => !isHashtagLine(line))
    .slice(-2);
}

/** CTA détecté (lignes concernées jointes), ou `null`. */
export function detectCta(
  text: string,
  lexicon: readonly string[] = DEFAULT_CTA_LEXICON,
): string | null {
  const matched = lastTwoContentLines(text)
    .filter((line) => isCtaLine(line, lexicon))
    .map(cleanCta)
    .filter(Boolean);
  return matched.length > 0 ? matched.join(" ") : null;
}
