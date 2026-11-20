/**
 * Index BM25 en mémoire (section 9.1). Construit au chargement, puis mis à jour
 * document par document à chaque écriture. Logique pure.
 */

export interface Bm25Params {
  /** Saturation de la fréquence d'un terme. */
  k1: number;
  /** Poids de la normalisation par la longueur du document. */
  b: number;
}

export const DEFAULT_BM25: Bm25Params = { k1: 1.2, b: 0.75 };

export class Bm25Index {
  private readonly frequencies = new Map<string, Map<string, number>>();
  private readonly lengths = new Map<string, number>();
  /** Terme → documents qui le contiennent. */
  private readonly postings = new Map<string, Set<string>>();
  private totalLength = 0;

  constructor(private readonly params: Bm25Params = DEFAULT_BM25) {}

  get size(): number {
    return this.frequencies.size;
  }

  has(id: string): boolean {
    return this.frequencies.has(id);
  }

  upsert(id: string, tokens: readonly string[]): void {
    this.remove(id);
    const tf = new Map<string, number>();
    for (const token of tokens) tf.set(token, (tf.get(token) ?? 0) + 1);
    this.frequencies.set(id, tf);
    this.lengths.set(id, tokens.length);
    this.totalLength += tokens.length;
    for (const term of tf.keys()) {
      let docs = this.postings.get(term);
      if (!docs) {
        docs = new Set();
        this.postings.set(term, docs);
      }
      docs.add(id);
    }
  }

  remove(id: string): void {
    const tf = this.frequencies.get(id);
    if (!tf) return;
    for (const term of tf.keys()) {
      const docs = this.postings.get(term);
      docs?.delete(id);
      if (docs?.size === 0) this.postings.delete(term);
    }
    this.totalLength -= this.lengths.get(id) ?? 0;
    this.frequencies.delete(id);
    this.lengths.delete(id);
  }

  clear(): void {
    this.frequencies.clear();
    this.lengths.clear();
    this.postings.clear();
    this.totalLength = 0;
  }

  /** IDF de Robertson-Spärck Jones, toujours positive. */
  idf(term: string): number {
    const n = this.postings.get(term)?.size ?? 0;
    return Math.log(1 + (this.size - n + 0.5) / (n + 0.5));
  }

  /**
   * Score BM25 de chaque document pertinent pour la requête.
   * `allowed` restreint les documents évalués ; les autres sont ignorés.
   */
  score(queryTokens: readonly string[], allowed?: ReadonlySet<string>): Map<string, number> {
    const scores = new Map<string, number>();
    if (this.size === 0) return scores;
    const { k1, b } = this.params;
    const averageLength = this.totalLength / this.size || 1;

    for (const term of new Set(queryTokens)) {
      const docs = this.postings.get(term);
      if (!docs) continue;
      const idf = this.idf(term);
      for (const id of docs) {
        if (allowed && !allowed.has(id)) continue;
        const tf = this.frequencies.get(id)?.get(term) ?? 0;
        const length = this.lengths.get(id) ?? 0;
        const weight = (tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * length) / averageLength));
        scores.set(id, (scores.get(id) ?? 0) + idf * weight);
      }
    }
    return scores;
  }
}
