/**
 * Post-traitement commun à toute sortie (natif, IA, édition CM) : section 10.7.
 * Ordre : nettoyage, linter, adaptation plateforme, Fact Guard, anti-copie.
 * L'adaptation passe avant le Fact Guard pour que les positions surlignées
 * correspondent au texte final (voir PROGRESS.md, Phase 5).
 */
import { lintText, type LintContext, type LintFix, type LintWarning } from "@/lib/editorial/linter";
import { checkPlatform } from "@/lib/platforms/counters";
import type { FactWarning, Platform } from "@/types/domain";
import { copyCheck, type CopyCheck, type CopySource } from "./anti-copy";
import { factGuard, type AllowedFacts } from "./fact-guard";

/** Lignes vides multiples, espaces en fin de ligne, espace avant une virgule ou un point. */
export function cleanupText(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((line) =>
      line
        .replace(/[ \t]+$/g, "")
        .replace(/ +([,.])/g, "$1")
        .replace(/ {2,}/g, " "),
    )
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Raccourcit un texte trop long pour la plateforme en retirant des paragraphes par la fin,
 * sans jamais toucher à l'accroche ni couper une phrase.
 */
export function adaptToPlatform(
  text: string,
  platform: Platform,
): { text: string; adapted: boolean } {
  let paragraphs = text.split(/\n\s*\n/);
  let adapted = false;
  while (checkPlatform(paragraphs.join("\n\n"), platform).overLimit && paragraphs.length > 2) {
    paragraphs = paragraphs.slice(0, -1);
    adapted = true;
  }
  return { text: paragraphs.join("\n\n"), adapted };
}

export interface PostProcessContext {
  lint: LintContext;
  platform: Platform;
  allowed: AllowedFacts;
  vocabulary?: ReadonlySet<string>;
  broadcasters?: readonly string[];
  references: readonly CopySource[];
}

export interface PostProcessResult {
  text: string;
  fixes: LintFix[];
  warnings: LintWarning[];
  factWarnings: FactWarning[];
  copy: CopyCheck;
  adapted: boolean;
}

export function postProcess(raw: string, context: PostProcessContext): PostProcessResult {
  const linted = lintText(cleanupText(raw), { ...context.lint, platform: context.platform });
  const { text, adapted } = adaptToPlatform(linted.text, context.platform);
  const final = adapted ? lintText(text, { ...context.lint, platform: context.platform }) : linted;
  return {
    text: final.text,
    fixes: linted.fixes,
    warnings: final.warnings,
    factWarnings: factGuard(final.text, {
      allowed: context.allowed,
      vocabulary: context.vocabulary,
      broadcasters: context.broadcasters,
    }),
    copy: copyCheck(final.text, context.references),
    adapted,
  };
}
