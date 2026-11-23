/**
 * Doublons (section 14.3) : exacts par `contentHash` (texte normalisé), proches par Jaccard
 * sur les suites de 3 mots, à partir de 0,85. Vérifiés contre la bibliothèque et à
 * l'intérieur du lot importé. Logique pure.
 */
import { jaccard, normalizeText } from "@/lib/editorial/text-utils";

export const NEAR_THRESHOLD = 0.85;

export type Duplicate =
  | { kind: "new" }
  | { kind: "exact"; of: string; inBatch: boolean }
  | { kind: "near"; of: string; inBatch: boolean; similarity: number };

export interface DedupeItem {
  /** Identifiant (bibliothèque) ou clé de ligne (lot). */
  id: string;
  text: string;
  /** SHA-256 du texte normalisé (`sha256Hex(normalizeText(text))`). */
  hash: string;
}

/** Suites de 3 mots du texte normalisé (hashtags et ponctuation ignorés). */
export function shingles(text: string): Set<string> {
  const words = normalizeText(text.replace(/#[\p{L}\p{N}_]+/gu, " "))
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
  if (words.length < 3) return new Set(words.length > 0 ? [words.join(" ")] : []);
  const result = new Set<string>();
  for (let i = 0; i + 2 < words.length; i += 1)
    result.add(`${words[i]} ${words[i + 1]} ${words[i + 2]}`);
  return result;
}

/**
 * Statut de chaque élément du lot. Un élément est comparé à la bibliothèque, puis aux
 * éléments du lot qui le précèdent (le premier exemplaire reste « Nouveau »).
 */
export function detectDuplicates(
  batch: readonly DedupeItem[],
  library: readonly DedupeItem[],
): Map<string, Duplicate> {
  const byHash = new Map<string, { id: string; inBatch: boolean }>();
  for (const item of library) byHash.set(item.hash, { id: item.id, inBatch: false });

  // Index inversé des suites de mots : seuls les textes qui en partagent sont comparés.
  const sets = new Map<string, Set<string>>();
  const postings = new Map<string, Set<string>>();
  const origin = new Map<string, boolean>();
  const add = (item: DedupeItem, inBatch: boolean) => {
    const set = shingles(item.text);
    sets.set(item.id, set);
    origin.set(item.id, inBatch);
    for (const s of set) {
      if (!postings.has(s)) postings.set(s, new Set());
      postings.get(s)!.add(item.id);
    }
  };
  for (const item of library) add(item, false);

  const result = new Map<string, Duplicate>();
  for (const item of batch) {
    const exact = byHash.get(item.hash);
    if (exact) {
      result.set(item.id, { kind: "exact", of: exact.id, inBatch: exact.inBatch });
    } else {
      const own = shingles(item.text);
      const candidates = new Set<string>();
      for (const s of own) for (const id of postings.get(s) ?? []) candidates.add(id);
      let best: { id: string; similarity: number } | undefined;
      for (const id of candidates) {
        const similarity = jaccard(own, sets.get(id)!);
        if (similarity >= NEAR_THRESHOLD && (!best || similarity > best.similarity))
          best = { id, similarity };
      }
      result.set(
        item.id,
        best
          ? {
              kind: "near",
              of: best.id,
              inBatch: origin.get(best.id)!,
              similarity: Math.round(best.similarity * 100) / 100,
            }
          : { kind: "new" },
      );
    }
    if (!byHash.has(item.hash)) byHash.set(item.hash, { id: item.id, inBatch: true });
    add(item, true);
  }
  return result;
}
