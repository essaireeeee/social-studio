/**
 * Linter éditorial (section 7.4). S'applique à toute sortie : moteur natif, IA, édition CM.
 *
 * 1. Corrections automatiques, dans l'ordre des règles (`order`) :
 *    casse de la marque, « de HEXAGONE MMA », exception ceinture / titre, règles de
 *    remplacement personnalisées, hashtags en double, espaces typographiques.
 * 2. Avertissements calculés sur le texte corrigé (positions relatives à ce texte).
 *
 * Logique pure : les règles actives sont passées en paramètre (défaut : règles intégrées).
 */
import { getCategory, winnerChoices } from "@/lib/categories/registry";
import { checkPlatform } from "@/lib/platforms/counters";
import { PLATFORM_RULES } from "@/lib/platforms/rules";
import type { BriefFieldValue, EditorialRule, Platform } from "@/types/domain";
import {
  DEFAULT_EDITORIAL_RULES,
  DEFEAT_LEXICON,
  RULE_IDS,
  STYLE_DEFAULTS,
  sortRules,
} from "./rules";
import {
  extractHook,
  hashtagRegex,
  jaccard,
  listEmojis,
  literalPattern,
  normalizeText,
  urlRegex,
  wordSet,
} from "./text-utils";

export interface LintFix {
  ruleId: string;
  label: string;
  count: number;
}

export type LintWarningKind =
  | "emoji_overload"
  | "repetitive_hook"
  | "ai_formula"
  | "final_question"
  | "samba_sima"
  | "platform_limit"
  | "hashtag_limit"
  | "forbidden"
  | "required_missing";

export interface LintWarning {
  ruleId: string;
  kind: LintWarningKind;
  severity: "warning" | "suggestion";
  message: string;
  start?: number;
  end?: number;
}

export interface LintResult {
  text: string;
  fixes: LintFix[];
  warnings: LintWarning[];
}

export interface LintContext {
  /** Règles en base (actives ou non). Défaut : règles intégrées. */
  rules?: readonly EditorialRule[];
  categoryId?: string;
  fields?: Readonly<Record<string, BriefFieldValue | undefined>>;
  platform?: Platform;
  /** Espace insécable avant ! ? : ; (réglage `frenchSpacing`, vrai par défaut). */
  frenchSpacing?: boolean;
  /** p90 des emojis par post du profil de style ; 6 si le profil est insuffisant. */
  emojiThreshold?: number;
  /** Accroches des dernières générations validées (20 au plus sont comparées). */
  recentHooks?: readonly string[];
}

const NBSP = String.fromCharCode(0xa0);
const HORIZONTAL_SPACE = "[ \\t\\u00A0\\u202F]";
const ALLOWED_FLAGS = /[dimsuy]/g;
const INLINE_SPACE = new RegExp("[ \\t\\u00A0]");
/** Espaces, emojis et caractères de liaison : ce qui reste quand on retire le contenu. */
const DECORATION = new RegExp("[\\s\\p{Extended_Pictographic}\\uFE0F\\u200D]", "gu");
const TRAILING_DECORATION = new RegExp("[\\s\\p{Extended_Pictographic}\\uFE0F\\u200D]+$", "u");

// ---------------------------------------------------------------------------
// Corrections
// ---------------------------------------------------------------------------

/** Remplace `$1`, `$&`, `$<nom>`, `$$` comme `String.prototype.replace`. */
function expandReplacement(
  template: string,
  match: string,
  captures: readonly (string | undefined)[],
  groups: Record<string, string | undefined> | undefined,
): string {
  return template.replace(
    /\$(\$|&|<([^>]+)>|(\d{1,2}))/g,
    (token, symbol: string, name?: string, digits?: string) => {
      if (symbol === "$") return "$";
      if (symbol === "&") return match;
      if (name !== undefined) return groups?.[name] ?? "";
      if (digits !== undefined) {
        const two = Number(digits);
        if (digits.length === 2 && two >= 1 && two <= captures.length)
          return captures[two - 1] ?? "";
        const one = Number(digits[0]);
        if (one >= 1 && one <= captures.length) return (captures[one - 1] ?? "") + digits.slice(1);
      }
      return token;
    },
  );
}

function compile(pattern: string, flags = "", global = true): RegExp | null {
  try {
    const kept = (flags.match(ALLOWED_FLAGS) ?? []).join("");
    return new RegExp(pattern, global ? `${kept}g` : kept);
  } catch {
    return null; // Motif invalide (règle personnalisée mal saisie) : ignoré.
  }
}

function applyReplaceRule(text: string, rule: EditorialRule): { text: string; count: number } {
  const re = rule.pattern ? compile(rule.pattern, rule.flags) : null;
  if (!re || rule.replacement === undefined) return { text, count: 0 };
  let count = 0;
  const replacement = rule.replacement;
  const result = text.replace(re, (...args: unknown[]) => {
    const match = args[0] as string;
    const hasGroups = typeof args.at(-1) === "object" && args.at(-1) !== null;
    const captures = args.slice(1, hasGroups ? -3 : -2) as (string | undefined)[];
    const groups = hasGroups ? (args.at(-1) as Record<string, string | undefined>) : undefined;
    const replaced = expandReplacement(replacement, match, captures, groups);
    if (replaced !== match) count += 1;
    return replaced;
  });
  return { text: result, count };
}

/** Supprime les hashtags répétés (insensible à la casse), en gardant la première occurrence. */
export function removeDuplicateHashtags(text: string): { text: string; count: number } {
  const seen = new Set<string>();
  let count = 0;
  const lines: string[] = [];
  for (const line of text.split("\n")) {
    let next = line;
    const duplicates = [...line.matchAll(hashtagRegex())].filter((m) => {
      const key = m[0].toLowerCase();
      if (seen.has(key)) return true;
      seen.add(key);
      return false;
    });
    for (const m of duplicates.reverse()) {
      let start = m.index;
      let end = start + m[0].length;
      if (start > 0 && INLINE_SPACE.test(next[start - 1] ?? "")) start -= 1;
      else if (INLINE_SPACE.test(next[end] ?? "")) end += 1;
      next = next.slice(0, start) + next.slice(end);
      count += 1;
    }
    if (duplicates.length > 0 && next.trim() === "") continue; // ligne vidée : supprimée
    lines.push(next);
  }
  return { text: lines.join("\n"), count };
}

/** Espaces : pas d'espace double ; espace insécable avant ! ? : ; si `nbsp`. Liens non touchés. */
export function fixFrenchSpacing(text: string, nbsp: boolean): { text: string; count: number } {
  let count = 0;
  const fixSegment = (segment: string) => {
    let out = segment.replace(new RegExp(`${HORIZONTAL_SPACE}{2,}`, "g"), (run) => {
      count += 1;
      return run.includes(NBSP) || run.includes(String.fromCharCode(0x202f)) ? NBSP : " ";
    });
    if (!nbsp) return out;
    out = out.replace(/ +(?=[!?;:])/g, () => {
      count += 1;
      return NBSP;
    });
    out = out.replace(/([\p{L}\p{N}»)"'’])(?=[!?;]|:(?:\s|$))/gu, (char) => {
      count += 1;
      return char + NBSP;
    });
    return out;
  };

  let result = "";
  let last = 0;
  for (const url of text.matchAll(urlRegex())) {
    result += fixSegment(text.slice(last, url.index)) + url[0];
    last = url.index + url[0].length;
  }
  result += fixSegment(text.slice(last));
  return { text: result, count };
}

// ---------------------------------------------------------------------------
// Avertissements
// ---------------------------------------------------------------------------

function findFirst(text: string, re: RegExp | null): { start: number; end: number } | null {
  if (!re) return null;
  const match = re.exec(text);
  return match ? { start: match.index, end: match.index + match[0].length } : null;
}

const phraseRegex = (phrase: string) => compile(literalPattern(phrase), "iu", false);

/** Dernière ligne de contenu (ni vide, ni composée uniquement de hashtags et d'emojis). */
function lastContentLine(text: string): { line: string; start: number } | null {
  const lines = text.split("\n");
  let offset = text.length;
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i] ?? "";
    offset -= line.length + (i < lines.length - 1 ? 1 : 0);
    const residue = line.replace(hashtagRegex(), "").replace(DECORATION, "");
    if (residue) return { line, start: offset };
  }
  return null;
}

function sambaSimaApplies(text: string, context: LintContext): boolean {
  const category = context.categoryId ? getCategory(context.categoryId) : undefined;
  if (category && category.context !== "positive") return false;

  const fields = context.fields ?? {};
  const losing: string[] = [];
  const pushIfString = (value: BriefFieldValue | undefined) => {
    if (typeof value === "string") losing.push(value);
  };
  pushIfString(fields.loser);
  if (category?.id === "live_defense") pushIfString(fields.challenger);
  const choices = category ? winnerChoices(category, fields) : null;
  if (choices && typeof fields.winner === "string") {
    losing.push(...choices.filter((name) => name !== fields.winner));
  }
  if (losing.some((name) => normalizeText(name).includes("samba sima"))) return false;

  const normalized = ` ${normalizeText(text)} `;
  return !DEFEAT_LEXICON.some((word) => normalized.includes(word));
}

function warningsFor(rule: EditorialRule, text: string, context: LintContext): LintWarning[] {
  const base = { ruleId: rule.id };

  switch (rule.id) {
    case RULE_IDS.emojiOverload: {
      const threshold = context.emojiThreshold ?? STYLE_DEFAULTS.emojiThreshold;
      const count = listEmojis(text).length;
      return count > threshold
        ? [
            {
              ...base,
              kind: "emoji_overload",
              severity: "warning",
              message: `${count} emojis : au-delà du seuil habituel (${threshold}).`,
            },
          ]
        : [];
    }

    case RULE_IDS.repetitiveHooks: {
      const hook = extractHook(text);
      if (!hook || !context.recentHooks?.length) return [];
      const words = wordSet(hook.text);
      const best = Math.max(
        ...context.recentHooks
          .slice(0, STYLE_DEFAULTS.recentHooksWindow)
          .map((recent) => jaccard(words, wordSet(recent))),
      );
      if (best < STYLE_DEFAULTS.hookSimilarityThreshold) return [];
      const message =
        best === 1
          ? "Accroche identique à une publication validée récemment."
          : `Accroche trop proche d'une publication validée récemment (similarité ${Math.round(best * 100)} %).`;
      return [
        {
          ...base,
          kind: "repetitive_hook",
          severity: "warning",
          message,
          start: hook.start,
          end: hook.end,
        },
      ];
    }

    case RULE_IDS.finalQuestion: {
      if (!context.categoryId || !rule.values?.includes(context.categoryId)) return [];
      const last = lastContentLine(text);
      const stripped = last?.line.replace(TRAILING_DECORATION, "") ?? "";
      if (!last || !stripped.endsWith("?")) return [];
      const label = getCategory(context.categoryId)?.label ?? context.categoryId;
      return [
        {
          ...base,
          kind: "final_question",
          severity: "warning",
          message: `Question finale à retirer : la catégorie « ${label} » est factuelle.`,
          start: last.start,
          end: last.start + last.line.length,
        },
      ];
    }

    case RULE_IDS.sambaSima: {
      const mention = findFirst(text, phraseRegex("Samba Sima"));
      if (!mention || !sambaSimaApplies(text, context)) return [];
      const normalized = normalizeText(text);
      const qualified = (rule.values ?? []).some((value) =>
        normalized.includes(normalizeText(value)),
      );
      return qualified
        ? []
        : [
            {
              ...base,
              kind: "samba_sima",
              severity: "suggestion",
              message:
                "Samba Sima : le présenter comme un crack, un jeune phénomène exceptionnel (ex. « le crack Samba Sima »).",
              ...mention,
            },
          ];
    }
  }

  const isAiRule = rule.id === RULE_IDS.aiFormulas || rule.id === RULE_IDS.aiOpeningVeritable;
  const kind: LintWarningKind = isAiRule ? "ai_formula" : "forbidden";

  if (rule.kind === "forbid") {
    const found: LintWarning[] = [];
    if (rule.pattern) {
      const hit = findFirst(text, compile(rule.pattern, rule.flags, false));
      if (hit)
        found.push({
          ...base,
          kind,
          severity: "warning",
          message: `À éviter : ${rule.label}.`,
          ...hit,
        });
    }
    for (const value of rule.values ?? []) {
      const hit = findFirst(text, phraseRegex(value));
      if (hit) {
        const message = isAiRule
          ? `Formule typique d'IA à éviter : « ${value} ».`
          : `À éviter : « ${value} ».`;
        found.push({ ...base, kind, severity: "warning", message, ...hit });
      }
    }
    return found;
  }

  if (rule.kind === "require") {
    const present =
      (rule.pattern !== undefined &&
        findFirst(text, compile(rule.pattern, rule.flags, false)) !== null) ||
      (rule.values ?? []).some((value) => findFirst(text, phraseRegex(value)) !== null);
    return present
      ? []
      : [
          {
            ...base,
            kind: "required_missing",
            severity: "warning",
            message: `Élément attendu absent : ${rule.label}.`,
          },
        ];
  }

  return [];
}

function platformWarnings(text: string, platform: Platform): LintWarning[] {
  const rule = PLATFORM_RULES[platform];
  const check = checkPlatform(text, platform);
  const warnings: LintWarning[] = [];
  if (check.overLimit) {
    warnings.push({
      ruleId: "platform-limit",
      kind: "platform_limit",
      severity: "warning",
      message: `Trop long pour ${rule.label} : ${check.length} / ${check.maxLength} caractères.`,
    });
  }
  if (check.tooManyHashtags) {
    warnings.push({
      ruleId: "platform-limit",
      kind: "hashtag_limit",
      severity: "warning",
      message: `Trop de hashtags pour ${rule.label} : ${check.hashtags} / ${rule.maxHashtags}.`,
    });
  }
  return warnings;
}

// ---------------------------------------------------------------------------
// Point d'entrée
// ---------------------------------------------------------------------------

export function lintText(input: string, context: LintContext = {}): LintResult {
  const category = context.categoryId ? getCategory(context.categoryId) : undefined;
  const disabled = new Set(category?.disabledRules ?? []);
  const rules = sortRules(
    (context.rules ?? DEFAULT_EDITORIAL_RULES).filter(
      (rule) => rule.enabled && !disabled.has(rule.id),
    ),
  );

  let text = input;
  const fixes: LintFix[] = [];
  const record = (rule: EditorialRule, result: { text: string; count: number }) => {
    text = result.text;
    if (result.count > 0) fixes.push({ ruleId: rule.id, label: rule.label, count: result.count });
  };

  for (const rule of rules) {
    if (rule.id === RULE_IDS.hashtagDuplicates) record(rule, removeDuplicateHashtags(text));
    else if (rule.id === RULE_IDS.frenchSpacing)
      record(rule, fixFrenchSpacing(text, context.frenchSpacing !== false));
    else if (rule.kind === "replace") record(rule, applyReplaceRule(text, rule));
  }

  const warnings = rules.flatMap((rule) => warningsFor(rule, text, context));
  if (context.platform) warnings.push(...platformWarnings(text, context.platform));

  return { text, fixes, warnings };
}

/** « 1 correction éditoriale appliquée », « 3 corrections éditoriales appliquées », ou chaîne vide. */
export function formatFixSummary(fixes: readonly LintFix[]): string {
  const total = fixes.reduce((sum, fix) => sum + fix.count, 0);
  if (total === 0) return "";
  return total === 1
    ? "1 correction éditoriale appliquée"
    : `${total} corrections éditoriales appliquées`;
}
