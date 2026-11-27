/**
 * Atelier Français, orchestration (section 6.1) :
 * couche 1 (règles locales, toujours active, hors ligne), couche 2 (LanguageTool) et
 * couche 3 (relecture IA), optionnelles, puis fusion des alertes par position.
 */
import { DEFAULT_EDITORIAL_RULES, RULE_IDS } from "@/lib/editorial/rules";
import type { FrenchSeverity } from "@/types/v2";
import { resolvePrefs } from "./prefs";
import { FRENCH_RULES, getFrenchRule } from "./rules";
import { dictionaryRanges, overlaps, protectedRanges, type Range } from "./text";
import type { CheckContext, FrenchIssue, FrenchRule, RuleContext } from "./types";

export const DEFAULT_AI_FORMULAS: readonly string[] =
  DEFAULT_EDITORIAL_RULES.find((r) => r.id === RULE_IDS.aiFormulas)?.values ?? [];

const SEVERITY_RANK: Record<FrenchSeverity, number> = { error: 3, warning: 2, suggestion: 1 };

/** Clé d'une alerte « ignorée ici » : la même règle sur le même passage. */
export function ignoreKey(issue: Pick<FrenchIssue, "ruleId" | "excerpt">): string {
  return `${issue.ruleId}|${issue.excerpt.toLowerCase()}`;
}

export interface LocalCheckOptions {
  /** Tests : n'exécuter que ces règles (actives ou non par défaut). */
  onlyRules?: ReadonlySet<string>;
}

function ruleIsActive(rule: FrenchRule, ctx: CheckContext): boolean {
  if (ctx.disabledRules?.has(rule.id)) return false;
  if (rule.enabledByDefault === false) return ctx.enabledRules?.has(rule.id) ?? false;
  return true;
}

/** Couche 1 : règles locales. Synchrone, hors ligne. */
export function checkLocal(
  text: string,
  ctx: CheckContext = {},
  options: LocalCheckOptions = {},
): FrenchIssue[] {
  if (!text.trim()) return [];
  const ruleCtx: RuleContext = {
    prefs: resolvePrefs(ctx.prefs),
    mode: ctx.mode,
    aiFormulas: ctx.aiFormulas ?? DEFAULT_AI_FORMULAS,
    broadcasters: ctx.broadcasters ?? [],
  };
  const shielded = protectedRanges(text, ctx.categoryId === "live_reaction");
  const named = dictionaryRanges(text, ctx.dictionary);
  const issues: FrenchIssue[] = [];

  for (const rule of FRENCH_RULES) {
    if (options.onlyRules ? !options.onlyRules.has(rule.id) : !ruleIsActive(rule, ctx)) continue;
    for (const match of rule.detect(text, ruleCtx)) {
      const range: Range = { start: match.start, end: match.end };
      if (shielded.some((r) => overlaps(r, range))) continue;
      if (!rule.ignoreDictionary && named.some((r) => overlaps(r, range))) continue;
      const excerpt = text.slice(match.start, match.end);
      if (match.replacement !== undefined && match.replacement === excerpt) continue;
      const issue: FrenchIssue = {
        id: `local:${rule.id}:${match.start}`,
        ruleId: rule.id,
        family: rule.family,
        layer: "local",
        severity: rule.severity,
        confidence: rule.confidence,
        start: match.start,
        end: match.end,
        excerpt,
        replacement: match.replacement,
        message: match.message ?? rule.title,
        autofix: Boolean(rule.autofix),
      };
      if (ctx.ignored?.has(ignoreKey(issue))) continue;
      issues.push(issue);
    }
  }
  return sortIssues(dedupe(issues));
}

function priority(issue: FrenchIssue): number {
  return (
    SEVERITY_RANK[issue.severity] * 10 +
    (issue.confidence === "high" ? 2 : 0) +
    (issue.layer === "local" ? 1 : 0)
  );
}

/** Une seule alerte par passage identique : la plus grave, la plus sûre, la locale d'abord. */
function dedupe(issues: FrenchIssue[]): FrenchIssue[] {
  const byRange = new Map<string, FrenchIssue>();
  for (const issue of issues) {
    const key = `${issue.start}:${issue.end}`;
    const kept = byRange.get(key);
    if (!kept || priority(issue) > priority(kept)) byRange.set(key, issue);
  }
  return [...byRange.values()];
}

function sortIssues(issues: FrenchIssue[]): FrenchIssue[] {
  return issues.sort((a, b) => a.start - b.start || b.end - a.end);
}

/**
 * Fusion des couches (dédoublonnage par position) : une alerte distante qui chevauche une
 * alerte locale est écartée ; les mots du dictionnaire ne sont jamais signalés.
 */
export function mergeIssues(
  text: string,
  local: readonly FrenchIssue[],
  remote: readonly FrenchIssue[],
  ctx: CheckContext = {},
): FrenchIssue[] {
  const named = dictionaryRanges(text, ctx.dictionary);
  const shielded = protectedRanges(text, ctx.categoryId === "live_reaction");
  const kept = remote.filter(
    (issue) =>
      issue.start >= 0 &&
      issue.end <= text.length &&
      text.slice(issue.start, issue.end) === issue.excerpt &&
      !local.some((l) => overlaps(l, issue)) &&
      !named.some((r) => overlaps(r, issue)) &&
      !shielded.some((r) => overlaps(r, issue)) &&
      !ctx.ignored?.has(ignoreKey(issue)),
  );
  return sortIssues(dedupe([...local, ...kept]));
}

/** Correction applicable sans confirmation : faute sûre, ou typographie. */
export function isAutoFixable(issue: FrenchIssue): boolean {
  if (issue.replacement === undefined) return false;
  return issue.autofix || (issue.severity === "error" && issue.confidence === "high");
}

/** Applique des corrections, de la fin vers le début, sans chevauchement (la plus prioritaire gagne). */
export function applyFixes(text: string, issues: readonly FrenchIssue[]): string {
  const chosen: FrenchIssue[] = [];
  const candidates = issues
    .filter((i) => i.replacement !== undefined)
    .sort((a, b) => priority(b) - priority(a));
  for (const issue of candidates) {
    if (!chosen.some((c) => overlaps(c, issue))) chosen.push(issue);
  }
  let out = text;
  for (const issue of chosen.sort((a, b) => b.start - a.start)) {
    if (out.slice(issue.start, issue.end) !== issue.excerpt) continue;
    out = out.slice(0, issue.start) + issue.replacement + out.slice(issue.end);
  }
  return out;
}

/** « Tout corriger » : fautes sûres et typographie ; les « À vérifier » restent manuels. */
export function fixAll(text: string, issues: readonly FrenchIssue[]): string {
  return applyFixes(text, issues.filter(isAutoFixable));
}

/** Corrige un texte jusqu'à stabilité (une correction peut en révéler une autre). */
export function autoCorrect(text: string, ctx: CheckContext = {}, rounds = 3): string {
  let current = text;
  for (let i = 0; i < rounds; i += 1) {
    const next = fixAll(current, checkLocal(current, ctx));
    if (next === current) break;
    current = next;
  }
  return current;
}

/** Résumé pour le badge d'une variante. */
export function issueSummary(issues: readonly FrenchIssue[]): {
  errors: number;
  toCheck: number;
  suggestions: number;
} {
  let errors = 0;
  let toCheck = 0;
  let suggestions = 0;
  for (const issue of issues) {
    if (issue.severity === "error" && issue.confidence === "high") errors += 1;
    else if (issue.severity === "suggestion") suggestions += 1;
    else toCheck += 1;
  }
  return { errors, toCheck, suggestions };
}

/** Texte prêt à copier : espace fine remplacée par l'insécable si « Compatibilité réseaux sociaux ». */
export function forCopy(text: string, socialCompat: boolean): string {
  return socialCompat ? text.replace(new RegExp("\\u202F", "g"), " ") : text;
}

export { FRENCH_RULES, getFrenchRule };
