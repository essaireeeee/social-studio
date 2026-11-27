/**
 * Couches 2 et 3 de l'Atelier Français : contrat de la route `/api/french/check` et
 * traitements purs partagés (placement des alertes, garde-fou des corrections IA).
 */
import { z } from "zod";
import type { FrenchIssue } from "./types";

export const MAX_CHECK_LENGTH = 10_000;

export const RemoteLayerSchema = z.enum(["languagetool", "ai"]);
export type RemoteLayer = z.infer<typeof RemoteLayerSchema>;

export const FrenchCheckRequestSchema = z.object({
  text: z.string().min(1).max(MAX_CHECK_LENGTH),
  layers: z.array(RemoteLayerSchema).min(1),
  /** Fournisseur de la relecture IA (le moteur choisi dans Paramètres > IA). */
  provider: z.enum(["anthropic", "openai"]).optional(),
});
export type FrenchCheckRequest = z.infer<typeof FrenchCheckRequestSchema>;

export type LayerStatus = "ok" | "disabled" | "unavailable";

export interface LayerResult {
  status: LayerStatus;
  issues: FrenchIssue[];
  /** Raison lisible quand la couche est indisponible (jamais bloquant). */
  message?: string;
}

export interface FrenchCheckResponse {
  languagetool?: LayerResult;
  ai?: LayerResult;
}

export interface FrenchStatusResponse {
  languagetool: { configured: boolean };
  ai: { anthropic: boolean; openai: boolean };
}

export interface FrenchProbeResponse {
  ok: boolean;
  durationMs?: number;
  message: string;
}

/** Erreur proposée par la relecture IA, avant placement dans le texte. */
export const AiReviewSchema = z.object({
  errors: z
    .array(
      z.object({
        excerpt: z.string().min(1).max(200),
        correction: z.string().max(200),
        rule: z.string().max(120),
      }),
    )
    .max(40),
});
export type AiReview = z.infer<typeof AiReviewSchema>;

const words = (text: string) => text.match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];

/**
 * Plus longue suite de mots modifiés entre l'extrait et la correction (alignement par
 * plus longue sous-séquence commune). Au-delà de 3 mots consécutifs, la correction IA est
 * une reformulation : elle est rejetée (section 6.1).
 */
export function longestChangedRun(excerpt: string, correction: string): number {
  const a = words(excerpt.toLowerCase());
  const b = words(correction.toLowerCase());
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i -= 1)
    for (let j = b.length - 1; j >= 0; j -= 1)
      lcs[i]![j] =
        a[i] === b[j] ? lcs[i + 1]![j + 1]! + 1 : Math.max(lcs[i + 1]![j]!, lcs[i]![j + 1]!);
  // Une substitution de k mots compte k (et non 2k) : on garde, dans chaque suite de
  // changements, le plus grand des deux nombres (mots retirés, mots ajoutés).
  let i = 0;
  let j = 0;
  let removed = 0;
  let added = 0;
  let longest = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      removed = 0;
      added = 0;
      i += 1;
      j += 1;
    } else if (j < b.length && (i >= a.length || lcs[i]![j + 1]! >= lcs[i + 1]![j]!)) {
      added += 1;
      j += 1;
    } else {
      removed += 1;
      i += 1;
    }
    longest = Math.max(longest, removed, added);
  }
  return longest;
}

/** Place les erreurs de la relecture IA dans le texte (première occurrence libre). */
export function placeAiErrors(text: string, review: AiReview): FrenchIssue[] {
  const used: { start: number; end: number }[] = [];
  const out: FrenchIssue[] = [];
  for (const error of review.errors) {
    if (error.correction === error.excerpt) continue;
    if (longestChangedRun(error.excerpt, error.correction) > 3) continue;
    let from = 0;
    let start = -1;
    for (;;) {
      const at = text.indexOf(error.excerpt, from);
      if (at < 0) break;
      if (!used.some((u) => at < u.end && u.start < at + error.excerpt.length)) {
        start = at;
        break;
      }
      from = at + 1;
    }
    if (start < 0) continue;
    const end = start + error.excerpt.length;
    used.push({ start, end });
    out.push({
      id: `ai:${start}`,
      ruleId: "ai:relecture",
      layer: "ai",
      severity: "error",
      confidence: "medium",
      start,
      end,
      excerpt: error.excerpt,
      replacement: error.correction,
      message: error.rule ? `Relecture IA : ${error.rule}` : "Relecture IA",
      autofix: false,
    });
  }
  return out;
}

/** Correspondance renvoyée par LanguageTool (`/v2/check`). */
export interface LanguageToolMatch {
  message: string;
  shortMessage?: string;
  offset: number;
  length: number;
  replacements?: { value: string }[];
  rule?: { id: string; issueType?: string; category?: { id?: string; name?: string } };
}

/** Alertes LanguageTool : toujours « À vérifier », jamais corrigées sans confirmation. */
export function fromLanguageTool(
  text: string,
  matches: readonly LanguageToolMatch[],
): FrenchIssue[] {
  const out: FrenchIssue[] = [];
  for (const match of matches) {
    const start = match.offset;
    const end = match.offset + match.length;
    if (start < 0 || end > text.length || end <= start) continue;
    const type = match.rule?.issueType ?? "";
    const severity =
      type === "misspelling" || type === "grammar"
        ? "error"
        : type === "style" || type === "locale-violation"
          ? "suggestion"
          : "warning";
    out.push({
      id: `languagetool:${match.rule?.id ?? "rule"}:${start}`,
      ruleId: `lt:${match.rule?.id ?? "rule"}`,
      layer: "languagetool",
      severity,
      confidence: "medium",
      start,
      end,
      excerpt: text.slice(start, end),
      replacement: match.replacements?.[0]?.value,
      message: match.message,
      autofix: false,
    });
  }
  return out;
}
