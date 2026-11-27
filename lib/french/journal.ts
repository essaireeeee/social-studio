/**
 * Journal des alertes (table `frenchIssues`) : ce que le CM a fait de chaque alerte.
 * Alimente « Mes points faibles », l'entraînement et la règle du jour.
 */
import type { DataRepository } from "@/lib/database/repository";
import type { FrenchIssueRecord, FrenchResolution } from "@/types/v2";
import type { FrenchIssue } from "./types";

export type FrenchAuthor = FrenchIssueRecord["author"];

export function issueRecord(
  issue: FrenchIssue,
  resolution: FrenchResolution,
  author: FrenchAuthor,
  now: Date,
): FrenchIssueRecord {
  return {
    id: crypto.randomUUID(),
    ruleId: issue.ruleId,
    family: issue.family,
    layer: issue.layer,
    severity: issue.severity,
    confidence: issue.confidence,
    author,
    excerpt: issue.excerpt.slice(0, 200) || "…",
    correction: issue.replacement?.slice(0, 200),
    resolution,
    createdAt: now.toISOString(),
  };
}

export async function logIssues(
  repository: DataRepository,
  issues: readonly FrenchIssue[],
  resolution: FrenchResolution,
  author: FrenchAuthor,
  now: Date = new Date(),
): Promise<void> {
  if (issues.length === 0) return;
  await repository.frenchIssues.bulkPut(issues.map((i) => issueRecord(i, resolution, author, now)));
}
