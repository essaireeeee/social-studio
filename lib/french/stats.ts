/**
 * « Mes points faibles », entraînement et règle du jour (section 6.5). Logique pure,
 * calculée sur le journal `frenchIssues`, en excluant les sorties des moteurs.
 */
import type { FrenchIssueRecord, FrenchRuleFamily } from "@/types/v2";
import { FRENCH_RULES, getFrenchRule } from "./rules";
import type { FrenchRule } from "./types";

/** Sous 10 alertes du CM, aucune statistique (section 6.5). */
export const MIN_ALERTS_FOR_STATS = 10;
const DAY_MS = 86_400_000;

export interface WeakPoint {
  ruleId: string;
  title: string;
  family?: FrenchRuleFamily;
  count: number;
  /** Alertes des 30 derniers jours, et des 30 jours précédents. */
  last30: number;
  previous30: number;
}

export function cmRecords(records: readonly FrenchIssueRecord[]): FrenchIssueRecord[] {
  return records.filter((r) => r.author === "cm");
}

/** Règles les plus souvent déclenchées sur les textes du CM, ou `null` sous 10 alertes. */
export function weakPoints(
  records: readonly FrenchIssueRecord[],
  now: Date,
  limit = 8,
): WeakPoint[] | null {
  const own = cmRecords(records);
  if (own.length < MIN_ALERTS_FOR_STATS) return null;
  const byRule = new Map<string, WeakPoint>();
  for (const record of own) {
    const age = now.getTime() - Date.parse(record.createdAt);
    const point = byRule.get(record.ruleId) ?? {
      ruleId: record.ruleId,
      title:
        getFrenchRule(record.ruleId)?.title ??
        (record.layer === "ai" ? "Relecture IA" : "LanguageTool"),
      family: record.family,
      count: 0,
      last30: 0,
      previous30: 0,
    };
    point.count += 1;
    if (age <= 30 * DAY_MS) point.last30 += 1;
    else if (age <= 60 * DAY_MS) point.previous30 += 1;
    byRule.set(record.ruleId, point);
  }
  return [...byRule.values()]
    .sort((a, b) => b.count - a.count || a.ruleId.localeCompare(b.ruleId))
    .slice(0, limit);
}

export function trendLabel(point: WeakPoint): string {
  if (point.previous30 === 0 && point.last30 === 0) return "stable";
  if (point.last30 < point.previous30) return "en baisse";
  if (point.last30 > point.previous30) return "en hausse";
  return "stable";
}

/** Graine déterministe d'une date (même règle toute la journée). */
export function daySeed(date: Date): number {
  const key = date.toISOString().slice(0, 10);
  let hash = 0;
  for (const char of key) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return hash;
}

/**
 * Règle du jour : parmi les règles où le CM se trompe le plus, ou au hasard (stable sur la
 * journée) s'il n'y a pas assez de données. Seules les règles actives avec exemples comptent.
 */
export function ruleOfTheDay(
  records: readonly FrenchIssueRecord[],
  date: Date,
  isEnabled: (id: string) => boolean = () => true,
): FrenchRule {
  const candidates = FRENCH_RULES.filter(
    (r) => isEnabled(r.id) && r.examples.length > 0 && r.family !== "typographie",
  );
  const weak = (weakPoints(records, date, 5) ?? [])
    .map((p) => candidates.find((r) => r.id === p.ruleId))
    .filter((r): r is FrenchRule => Boolean(r));
  const pool = weak.length > 0 ? weak : candidates;
  return pool[daySeed(date) % pool.length]!;
}
