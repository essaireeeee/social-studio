/**
 * Requête de la bibliothèque (section 14.1) : filtres, recherche plein texte (BM25, et
 * recherche exacte des passages entre guillemets), tri. Logique pure : l'index BM25 est
 * construit une fois par liste de wordings (`createLibraryIndex`).
 */
import { normalizeText } from "@/lib/editorial/text-utils";
import { Bm25Index } from "@/lib/retrieval/index";
import { tokenize } from "@/lib/retrieval/tokenizer";
import type { Mode, Platform, Source, Wording } from "@/types/domain";

export type LibrarySort = "date" | "relevance" | "updated";

export interface LibraryFilters {
  text?: string;
  mode?: Mode;
  categoryId?: string;
  fighterId?: string;
  eventId?: string;
  /** AAAA-MM-JJ, bornes incluses. */
  dateFrom?: string;
  dateTo?: string;
  platform?: Platform;
  tag?: string;
  status?: Wording["status"];
  source?: Source;
  includeDemo?: boolean;
}

export const SORT_LABELS: Record<LibrarySort, string> = {
  date: "Date de publication",
  relevance: "Pertinence",
  updated: "Dernière modification",
};

export interface LibraryIndex {
  index: Bm25Index;
  byId: Map<string, Wording>;
}

export function createLibraryIndex(wordings: readonly Wording[]): LibraryIndex {
  const index = new Bm25Index();
  for (const w of wordings) index.upsert(w.id, tokenize(w.text));
  return { index, byId: new Map(wordings.map((w) => [w.id, w])) };
}

/** Passages entre guillemets (droits ou français) et mots restants. */
export function parseSearch(text: string): { phrases: string[]; words: string } {
  const phrases: string[] = [];
  const words = text.replace(/"([^"]+)"|«\s*([^»]+?)\s*»/g, (_, a: string, b: string) => {
    const phrase = normalizeText(a ?? b).trim();
    if (phrase) phrases.push(phrase);
    return " ";
  });
  return { phrases, words: words.trim() };
}

const dateOf = (w: Wording) => (w.date ?? w.createdAt).slice(0, 10);

function matches(w: Wording, f: LibraryFilters): boolean {
  if (!f.includeDemo && w.isDemo) return false;
  if (f.mode && w.mode !== f.mode) return false;
  if (f.categoryId && w.categoryId !== f.categoryId) return false;
  if (f.fighterId && !w.fighterIds.includes(f.fighterId)) return false;
  if (f.eventId && w.eventId !== f.eventId) return false;
  if (f.platform && w.platform !== f.platform) return false;
  if (f.tag && !w.tags.includes(f.tag)) return false;
  if (f.status && w.status !== f.status) return false;
  if (f.source && w.source !== f.source) return false;
  if (f.dateFrom && dateOf(w) < f.dateFrom) return false;
  if (f.dateTo && dateOf(w) > f.dateTo) return false;
  return true;
}

export interface LibraryResult {
  wordings: Wording[];
  /** Score BM25 par wording quand une recherche par mots est active. */
  scores: Map<string, number>;
}

export function queryLibrary(
  { index, byId }: LibraryIndex,
  filters: LibraryFilters,
  sort: LibrarySort,
): LibraryResult {
  const { phrases, words } = parseSearch(filters.text ?? "");
  let candidates = [...byId.values()].filter((w) => matches(w, filters));
  if (phrases.length > 0) {
    candidates = candidates.filter((w) => phrases.every((p) => w.textNormalized.includes(p)));
  }
  const terms = tokenize(words);
  let scores = new Map<string, number>();
  if (terms.length > 0) {
    scores = index.score(terms, new Set(candidates.map((w) => w.id)));
    candidates = candidates.filter((w) => (scores.get(w.id) ?? 0) > 0);
  }
  const effective = sort === "relevance" && terms.length === 0 ? "date" : sort;
  const sorted = [...candidates].sort((a, b) => {
    if (effective === "relevance") return (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0);
    if (effective === "updated") return b.updatedAt.localeCompare(a.updatedAt);
    return dateOf(b).localeCompare(dateOf(a)) || b.createdAt.localeCompare(a.createdAt);
  });
  return { wordings: sorted, scores };
}

/** Valeurs proposées dans les filtres (tags existants). */
export function libraryTags(wordings: readonly Wording[]): string[] {
  return [...new Set(wordings.flatMap((w) => w.tags))].sort((a, b) => a.localeCompare(b, "fr"));
}
