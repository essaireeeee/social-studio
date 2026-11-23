/** Compteurs de caractères par plateforme. Logique pure. */
// L'export nommé n'existe que dans la version CommonJS : la version ESM (routes Next) n'a
// qu'un export par défaut.
import twitterText from "twitter-text";
import type { Platform } from "@/types/domain";
import { countGraphemes, hashtagRegex } from "@/lib/editorial/text-utils";
import { PLATFORM_RULES } from "./rules";

export { countGraphemes };

/** Comptage pondéré officiel de X (emojis et caractères CJK comptent double, liens 23). */
export function xWeightedLength(text: string): number {
  return twitterText.parseTweet(text).weightedLength;
}

/** Partie valide d'un texte pour X, et la partie au-delà de 280 (affichée en rouge). */
export function xSplit(text: string): { valid: string; overflow: string; weightedLength: number } {
  const parsed = twitterText.parseTweet(text);
  if (parsed.valid || parsed.weightedLength <= 280) {
    return { valid: text, overflow: "", weightedLength: parsed.weightedLength };
  }
  const end = parsed.validRangeEnd + 1;
  return {
    valid: text.slice(0, end),
    overflow: text.slice(end),
    weightedLength: parsed.weightedLength,
  };
}

export function countForPlatform(text: string, platform: Platform): number {
  return PLATFORM_RULES[platform].counter === "twitter"
    ? xWeightedLength(text)
    : countGraphemes(text);
}

export function countHashtags(text: string): number {
  return text.match(hashtagRegex())?.length ?? 0;
}

export interface PlatformCheck {
  length: number;
  maxLength: number;
  overLimit: boolean;
  hashtags: number;
  tooManyHashtags: boolean;
}

export function checkPlatform(text: string, platform: Platform): PlatformCheck {
  const rule = PLATFORM_RULES[platform];
  const length = countForPlatform(text, platform);
  const hashtags = countHashtags(text);
  return {
    length,
    maxLength: rule.maxLength,
    overLimit: length > rule.maxLength,
    hashtags,
    tooManyHashtags: rule.maxHashtags !== undefined && hashtags > rule.maxHashtags,
  };
}
