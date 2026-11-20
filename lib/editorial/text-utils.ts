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
