/**
 * Utilitaires texte partagés (Phase 1 : normalisation, hashtags, emojis).
 * La Phase 3 complète ce module (graphèmes, lignes, phrases, n-grammes).
 * Logique pure, sans dépendance au navigateur ni à React.
 */

/**
 * Un emoji visuel : paire d'indicateurs régionaux (drapeau), touche numérotée (1️⃣),
 * ou pictogramme étendu avec ses sélecteurs de variante, modificateurs de teinte
 * et séquences ZWJ (👨‍👩‍👧 compte pour un seul emoji).
 */
const EMOJI_SOURCE =
  "\\p{Regional_Indicator}{2}" +
  "|[#*0-9]\\uFE0F?\\u20E3" +
  "|\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})*" +
  "(?:\\u200D\\p{Extended_Pictographic}(?:\\uFE0F|\\p{Emoji_Modifier})*)*";

/** Nouvelle instance à chaque appel : une regex globale partagée garde un `lastIndex`. */
export function emojiRegex(): RegExp {
  return new RegExp(EMOJI_SOURCE, "gu");
}

const HASHTAG_SOURCE = "#[\\p{L}\\p{N}_]+";

export function hashtagRegex(): RegExp {
  return new RegExp(HASHTAG_SOURCE, "gu");
}

/** Caractères invisibles résiduels : sélecteurs de variante, ZWJ, espaces sans chasse, BOM. */
const INVISIBLES = new RegExp("[\\uFE0E\\uFE0F\\u200B-\\u200D\\u2060\\uFEFF\\u20E3]", "g");
const APOSTROPHES = new RegExp("[\\u2018\\u2019\\u02BC\\u0060\\u00B4]", "g");

/** Liste des emojis du texte, dans l'ordre d'apparition, sans doublon. */
export function extractEmojis(text: string): string[] {
  return unique(text.match(emojiRegex()) ?? []);
}

/** Tous les emojis du texte, doublons compris (pour les comptages). */
export function listEmojis(text: string): string[] {
  return text.match(emojiRegex()) ?? [];
}

/** Hashtags du texte, dans l'ordre, sans doublon (comparaison insensible à la casse). */
export function extractHashtags(text: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const tag of text.match(hashtagRegex()) ?? []) {
    const lower = tag.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(tag);
    }
  }
  return result;
}

/** Retire les accents (é → e, ç → c) sans toucher aux autres caractères. */
export function stripAccents(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").normalize("NFC");
}

/**
 * Normalisation de référence d'un wording : minuscules, sans accents, sans emojis,
 * apostrophes typographiques unifiées, espaces (y compris retours ligne) compactés.
 * Sert au hash de doublon exact et à la recherche texte.
 */
export function normalizeText(text: string): string {
  const withoutEmojis = text.normalize("NFC").replace(emojiRegex(), " ").replace(INVISIBLES, "");
  return stripAccents(withoutEmojis.toLowerCase())
    .replace(APOSTROPHES, "'")
    .replace(/\s+/gu, " ")
    .trim();
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

// ---------------------------------------------------------------------------
// Liens, accroches, similarité
// ---------------------------------------------------------------------------

export function urlRegex(): RegExp {
  return /\bhttps?:\/\/[^\s]+|\bwww\.[^\s]+/giu;
}

export interface TextRange {
  text: string;
  start: number;
  end: number;
}

const HOOK_MAX_LENGTH = 140;

/**
 * Accroche : première ligne non vide, ou sa première phrase si elle dépasse
 * 140 caractères (section 8.4). Positions relatives au texte complet.
 */
export function extractHook(text: string): TextRange | null {
  let offset = 0;
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (trimmed) {
      const start = offset + line.indexOf(trimmed);
      let hook = trimmed;
      if (hook.length > HOOK_MAX_LENGTH) {
        const sentenceEnd = /[.!?…](?=\s|$)/u.exec(hook);
        if (sentenceEnd) hook = hook.slice(0, sentenceEnd.index + 1);
      }
      return { text: hook, start, end: start + hook.length };
    }
    offset += line.length + 1;
  }
  return null;
}

/** Mots normalisés d'un texte, sans hashtags, mentions ni liens. */
export function wordSet(text: string): Set<string> {
  const cleaned = text
    .replace(urlRegex(), " ")
    .replace(hashtagRegex(), " ")
    .replace(/@[\w.]+/g, " ");
  return new Set(
    normalizeText(cleaned)
      .split(/[^\p{L}\p{N}']+/u)
      .map((word) => word.replace(/^'+|'+$/g, ""))
      .filter(Boolean),
  );
}

/** Indice de Jaccard entre deux ensembles (0 si les deux sont vides). */
export function jaccard<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): number {
  if (a.size === 0 && b.size === 0) return 0;
  let shared = 0;
  for (const item of a) if (b.has(item)) shared += 1;
  return shared / (a.size + b.size - shared);
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ACCENT_CLASSES: Readonly<Record<string, string>> = {
  a: "aàâäáã",
  c: "cç",
  e: "eéèêë",
  i: "iîïíì",
  n: "nñ",
  o: "oôöóò",
  u: "uùûüú",
  y: "yÿ",
};

/**
 * Motif qui retrouve une expression quelle que soit l'accentuation, l'apostrophe
 * ou l'espacement (à utiliser avec les options `iu`). Délimité par des frontières de mot.
 */
export function literalPattern(phrase: string): string {
  const body = [...phrase.normalize("NFC").trim()]
    .map((char) => {
      if (/\s/u.test(char)) return "\\s+";
      if (char === "'" || char === "’") return "['’]";
      const base = stripAccents(char).toLowerCase();
      const variants = ACCENT_CLASSES[base];
      return variants ? `[${variants}]` : escapeRegex(char);
    })
    .join("");
  return `(?<![\\p{L}\\p{N}_])${body}(?![\\p{L}\\p{N}_])`;
}

// ---------------------------------------------------------------------------
// Découpage (section 8.2)
// ---------------------------------------------------------------------------

const graphemeSegmenter = new Intl.Segmenter("fr", { granularity: "grapheme" });

/** Caractères visibles : un emoji composé compte pour un. */
export function countGraphemes(text: string): number {
  let count = 0;
  for (const _ of graphemeSegmenter.segment(text)) count += 1;
  return count;
}

export function mentionRegex(): RegExp {
  return /@[\w.]+/g;
}

/** Lignes non vides, sans espaces de bord. */
export function contentLines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/** Paragraphes séparés par une ligne vide, chacun sous forme de lignes non vides. */
export function splitParagraphs(text: string): string[][] {
  return text
    .split(/\n\s*\n/)
    .map(contentLines)
    .filter((lines) => lines.length > 0);
}

/** Phrases : coupure après une ponctuation forte ou à chaque retour à la ligne. */
export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?…])\s+|\n+/u)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

/** Mots normalisés (sans accents, minuscules), hors liens, hashtags, mentions et emojis. */
export function tokenizeWords(text: string): string[] {
  const cleaned = text
    .replace(urlRegex(), " ")
    .replace(hashtagRegex(), " ")
    .replace(mentionRegex(), " ");
  return normalizeText(cleaned)
    .replace(/'/g, " ")
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

const LEADING_EMOJI = new RegExp(`^(?:${EMOJI_SOURCE})`, "u");

export function startsWithEmoji(line: string): boolean {
  return LEADING_EMOJI.test(line.trim());
}

/** Ligne composée uniquement de hashtags (et d'emojis ou d'espaces). */
export function isHashtagLine(line: string): boolean {
  if (!hashtagRegex().test(line)) return false;
  return line.replace(hashtagRegex(), "").replace(emojiRegex(), "").trim() === "";
}
