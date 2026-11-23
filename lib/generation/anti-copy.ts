/**
 * Anti-copie (section 10.7, étape 4) : une sortie ne doit jamais recopier une référence.
 * Copie si 8 mots consécutifs ou plus sont communs, ou si le Jaccard des groupes de
 * 3 mots dépasse 0,5. Logique pure.
 */
import { jaccard, tokenizeWords } from "@/lib/editorial/text-utils";

export const COPY_LIMITS = { maxRun: 8, maxShingleJaccard: 0.5 } as const;

export interface CopyCheck {
  copied: boolean;
  /** Référence la plus proche (si au moins une a été comparée). */
  referenceId?: string;
  longestRun: number;
  shingleJaccard: number;
}

export interface CopySource {
  id: string;
  text: string;
}

function shingles(words: readonly string[], size: number): Set<string> {
  const result = new Set<string>();
  for (let i = 0; i + size <= words.length; i += 1) result.add(words.slice(i, i + size).join(" "));
  return result;
}

/** Plus longue suite de mots consécutifs commune aux deux textes. */
export function longestCommonRun(a: readonly string[], b: readonly string[]): number {
  let best = 0;
  let previous = new Array<number>(b.length + 1).fill(0);
  for (let i = 1; i <= a.length; i += 1) {
    const current = new Array<number>(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        current[j] = (previous[j - 1] ?? 0) + 1;
        if (current[j]! > best) best = current[j]!;
      }
    }
    previous = current;
  }
  return best;
}

export function copyCheck(text: string, references: readonly CopySource[]): CopyCheck {
  const words = tokenizeWords(text);
  const own = shingles(words, 3);
  let worst: CopyCheck = { copied: false, longestRun: 0, shingleJaccard: 0 };
  for (const reference of references) {
    const other = tokenizeWords(reference.text);
    const run = longestCommonRun(words, other);
    const similarity = jaccard(own, shingles(other, 3));
    const copied = run >= COPY_LIMITS.maxRun || similarity > COPY_LIMITS.maxShingleJaccard;
    if (copied || run > worst.longestRun || similarity > worst.shingleJaccard) {
      worst = {
        copied: worst.copied || copied,
        referenceId: copied || !worst.copied ? reference.id : worst.referenceId,
        longestRun: Math.max(run, worst.longestRun),
        shingleJaccard: Math.max(similarity, worst.shingleJaccard),
      };
    }
  }
  return worst;
}
