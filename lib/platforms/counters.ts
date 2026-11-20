/** Compteurs de caractères par plateforme. Logique pure. */
import { parseTweet } from "twitter-text";
import type { Platform } from "@/types/domain";
import { countGraphemes, hashtagRegex } from "@/lib/editorial/text-utils";
import { PLATFORM_RULES } from "./rules";

export { countGraphemes };

/** Comptage pondéré officiel de X (emojis et caractères CJK comptent double, liens 23). */
export function xWeightedLength(text: string): number {
  return parseTweet(text).weightedLength;
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
