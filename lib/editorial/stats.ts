/** Statistiques descriptives simples. Logique pure. */

export function mean(values: readonly number[]): number {
  return values.length === 0 ? 0 : values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Percentile par interpolation linéaire (p entre 0 et 100). 0 pour une liste vide. */
export function percentile(values: readonly number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const low = Math.floor(rank);
  const high = Math.ceil(rank);
  const lowValue = sorted[low] ?? 0;
  const highValue = sorted[high] ?? lowValue;
  return lowValue + (highValue - lowValue) * (rank - low);
}

export function median(values: readonly number[]): number {
  return percentile(values, 50);
}

/** Arrondi à `digits` décimales, pour stocker des indicateurs lisibles. */
export function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Part (0 à 1), 0 si le dénominateur est nul. */
export function ratio(part: number, total: number): number {
  return total === 0 ? 0 : part / total;
}

/** Compte les occurrences, puis trie par nombre décroissant (ordre d'apparition en cas d'égalité). */
export function countBy<T>(
  items: Iterable<T>,
  key: (item: T) => string,
): Map<string, { item: T; count: number }> {
  const counts = new Map<string, { item: T; count: number }>();
  for (const item of items) {
    const k = key(item);
    const entry = counts.get(k);
    if (entry) entry.count += 1;
    else counts.set(k, { item, count: 1 });
  }
  return new Map([...counts.entries()].sort((a, b) => b[1].count - a[1].count));
}
