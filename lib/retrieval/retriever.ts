/**
 * Recherche des références de style (section 9).
 * v1 : `LocalBm25Retriever`, index BM25 en mémoire + score pondéré.
 * Évolution prévue : `PgVectorRetriever` (embeddings Supabase), voir le README.
 */
import { categoryFieldKeys, getCategory, getField } from "@/lib/categories/registry";
import { normalizeText } from "@/lib/editorial/text-utils";
import { structureFingerprint, type StructureContext } from "@/lib/editorial/structure";
import {
  RetrievalWeightsSchema,
  type Brief,
  type Fighter,
  type Generation,
  type HexEvent,
  type LiveSession,
  type Mode,
  type RetrievalWeights,
  type Wording,
} from "@/types/domain";
import { Bm25Index } from "./index";
import {
  mainReason,
  rawComponents,
  total,
  weighted,
  type EntityMatcher,
  type ScoreBreakdown,
} from "./scorer";
import { tokenize } from "./tokenizer";

export const REFERENCE_LIMITS = {
  min: 5,
  max: 10,
  /** Au-delà des 5 premières, une référence doit atteindre 40 % du meilleur score. */
  relativeFloor: 0.4,
  /** Au plus 3 références de même empreinte de structure (diversité). */
  maxPerStructure: 3,
} as const;

export interface RetrievalQuery {
  brief: Brief;
  /** Texte de la requête BM25 : libellé de catégorie + champs texte du brief. */
  queryText: string;
  fighters: EntityMatcher[];
  event?: EntityMatcher;
  /** Références des 5 dernières générations (pénalité « déjà utilisée »). */
  recentlyUsedIds: string[];
  /** Exclues par le CM pour cette génération. */
  excludeIds: string[];
  includeDemo: boolean;
  weights: RetrievalWeights;
  now: Date;
}

export interface ReferenceResult {
  wording: Wording;
  score: number;
  reason: string;
  /** Contributions pondérées de chaque composante. */
  breakdown: ScoreBreakdown;
  fingerprint: string;
}

export interface Retriever {
  retrieve(query: RetrievalQuery): Promise<ReferenceResult[]>;
}

// ---------------------------------------------------------------------------
// Construction de la requête à partir du brief
// ---------------------------------------------------------------------------

const fighterNames = (f: Fighter) =>
  [`${f.firstName} ${f.lastName}`.trim(), f.lastName, f.nickname ?? ""].filter(Boolean);

function resolveFighter(value: string, fighters: readonly Fighter[]): EntityMatcher {
  const needle = normalizeText(value);
  const fiche = fighters.find(
    (f) => f.id === value || fighterNames(f).some((name) => normalizeText(name) === needle),
  );
  return fiche ? { id: fiche.id, names: fighterNames(fiche) } : { names: [value] };
}

function resolveEvent(
  value: string | undefined,
  events: readonly HexEvent[],
  session?: LiveSession,
): EntityMatcher | undefined {
  const label = (e: Pick<HexEvent, "name" | "number">) => [
    e.number ? `${e.name} ${e.number}` : e.name,
  ];
  const byValue = value
    ? events.find(
        (e) => e.id === value || label(e).some((l) => normalizeText(l) === normalizeText(value)),
      )
    : undefined;
  if (byValue) return { id: byValue.id, names: label(byValue) };
  if (value) return { names: [value] };
  const bySession = session?.eventId ? events.find((e) => e.id === session.eventId) : undefined;
  if (bySession) return { id: bySession.id, names: label(bySession) };
  if (session)
    return {
      id: session.eventId,
      names: label({ name: session.eventName, number: session.eventNumber }),
    };
  return undefined;
}

export interface QueryContext {
  fighters?: readonly Fighter[];
  events?: readonly HexEvent[];
  liveSession?: LiveSession;
  /** Générations récentes, la plus récente d'abord ou non : elles sont triées ici. */
  recentGenerations?: readonly Pick<Generation, "createdAt" | "referenceIds">[];
  excludeIds?: readonly string[];
  includeDemo?: boolean;
  weights?: Partial<RetrievalWeights>;
  now?: Date;
}

export function buildRetrievalQuery(brief: Brief, context: QueryContext = {}): RetrievalQuery {
  const category = getCategory(brief.categoryId);
  const keys = category ? categoryFieldKeys(category) : Object.keys(brief.fields);

  const fighters = new Map<string, EntityMatcher>();
  const textParts: string[] = [category?.label ?? brief.categoryId];
  for (const key of keys) {
    const value = brief.fields[key];
    const values = Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
    const def = category ? getField(key) : undefined;
    if (def?.type === "url") continue;
    for (const item of values.filter((v) => v.trim())) {
      if (def?.type === "fighter") {
        const matcher = resolveFighter(item, context.fighters ?? []);
        fighters.set(matcher.id ?? normalizeText(item), matcher);
      }
      if (def?.type !== "event") textParts.push(item);
    }
  }

  const eventValue = typeof brief.fields.event === "string" ? brief.fields.event : undefined;
  const recent = [...(context.recentGenerations ?? [])]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 5);

  return {
    brief,
    queryText: textParts.join(" "),
    fighters: [...fighters.values()],
    event: resolveEvent(
      eventValue,
      context.events ?? [],
      brief.mode === "live" ? context.liveSession : undefined,
    ),
    recentlyUsedIds: [...new Set(recent.flatMap((g) => g.referenceIds))],
    excludeIds: [...(context.excludeIds ?? [])],
    includeDemo: context.includeDemo ?? false,
    weights: RetrievalWeightsSchema.parse(context.weights ?? {}),
    now: context.now ?? new Date(),
  };
}

// ---------------------------------------------------------------------------
// Retriever local
// ---------------------------------------------------------------------------

interface IndexedWording {
  wording: Wording;
  fingerprint: string;
}

export class LocalBm25Retriever implements Retriever {
  private readonly documents = new Map<string, IndexedWording>();
  private readonly indexes: Record<Mode, Bm25Index> = {
    live: new Bm25Index(),
    daily: new Bm25Index(),
  };

  constructor(private readonly structureContext: StructureContext = {}) {}

  get size(): number {
    return this.documents.size;
  }

  /** Reconstruit l'index à partir de la bibliothèque complète. */
  load(wordings: readonly Wording[]): void {
    this.documents.clear();
    this.indexes.live.clear();
    this.indexes.daily.clear();
    for (const wording of wordings) this.upsert(wording);
  }

  upsert(wording: Wording): void {
    this.remove(wording.id);
    this.documents.set(wording.id, {
      wording,
      fingerprint: structureFingerprint(wording.text, this.structureContext),
    });
    this.indexes[wording.mode].upsert(wording.id, tokenize(wording.text));
  }

  remove(id: string): void {
    const existing = this.documents.get(id);
    if (!existing) return;
    this.indexes[existing.wording.mode].remove(id);
    this.documents.delete(id);
  }

  /** Mise à jour incrémentale : seuls les posts nouveaux, modifiés ou supprimés sont réindexés. */
  sync(wordings: readonly Wording[]): { upserted: number; removed: number } {
    const seen = new Set<string>();
    let upserted = 0;
    for (const wording of wordings) {
      seen.add(wording.id);
      const current = this.documents.get(wording.id)?.wording;
      if (!current || current.updatedAt !== wording.updatedAt || current.text !== wording.text) {
        this.upsert(wording);
        upserted += 1;
      }
    }
    const stale = [...this.documents.keys()].filter((id) => !seen.has(id));
    stale.forEach((id) => this.remove(id));
    return { upserted, removed: stale.length };
  }

  async retrieve(query: RetrievalQuery): Promise<ReferenceResult[]> {
    return this.rank(query);
  }

  rank(query: RetrievalQuery): ReferenceResult[] {
    const { brief } = query;
    const excluded = new Set(query.excludeIds);
    // Filtre dur : même mode, références réelles (démos seulement sur demande), non exclues.
    const candidates = [...this.documents.values()].filter(
      ({ wording: w }) =>
        w.mode === brief.mode &&
        !excluded.has(w.id) &&
        ((w.isReference && !w.isDemo) || (query.includeDemo && w.isDemo)),
    );
    if (candidates.length === 0) return [];

    const bm25 = this.indexes[brief.mode].score(
      tokenize(query.queryText),
      new Set(candidates.map((c) => c.wording.id)),
    );
    const best = Math.max(0, ...bm25.values());
    const context = {
      categoryId: brief.categoryId,
      platform: brief.platform,
      fighters: query.fighters,
      event: query.event,
      recentlyUsed: new Set(query.recentlyUsedIds),
      weights: query.weights,
      now: query.now,
    };

    const scored = candidates
      .map(({ wording, fingerprint }) => {
        const raw = rawComponents(
          wording,
          best > 0 ? (bm25.get(wording.id) ?? 0) / best : 0,
          context,
        );
        const breakdown = weighted(raw, query.weights);
        return {
          wording,
          fingerprint,
          breakdown,
          score: total(breakdown),
          reason: mainReason(raw, breakdown, query.fighters.length),
        };
      })
      .sort((a, b) => b.score - a.score || b.wording.updatedAt.localeCompare(a.wording.updatedAt));

    return selectDiverse(scored);
  }
}

/** Entre 5 et 10 références, au plus 3 par empreinte de structure (MMR simplifié). */
export function selectDiverse(sorted: readonly ReferenceResult[]): ReferenceResult[] {
  const { min, max, relativeFloor, maxPerStructure } = REFERENCE_LIMITS;
  const best = sorted[0]?.score ?? 0;
  const perStructure = new Map<string, number>();
  const selected: ReferenceResult[] = [];
  for (const candidate of sorted) {
    if (selected.length >= max) break;
    if (candidate.score <= 0) break;
    if (selected.length >= min && candidate.score < best * relativeFloor) break;
    const used = perStructure.get(candidate.fingerprint) ?? 0;
    if (used >= maxPerStructure) continue;
    perStructure.set(candidate.fingerprint, used + 1);
    selected.push(candidate);
  }
  return selected;
}
