/**
 * Post-traitement des sorties IA (section 11.3) : le même que pour le moteur natif
 * (nettoyage, linter, adaptation plateforme, Fact Guard, anti-copie), précédé du retrait
 * des hashtags non cochés. Pour l'IA, l'anti-copie et le Fact Guard signalent sans
 * régénérer : le texte reste proposé, les passages à vérifier sont surlignés.
 */
import { STOPWORDS_FR } from "@/lib/editorial/stopwords-fr";
import { autoCorrect, checkLocal, isAutoFixable } from "@/lib/french/engine";
import { hashtagRegex, normalizeText } from "@/lib/editorial/text-utils";
import { buildAllowedFacts } from "@/lib/generation/fact-guard";
import { TEMPLATE_VOCABULARY } from "@/lib/generation/native/templates";
import { postProcess, type PostProcessResult } from "@/lib/generation/post-process";
import type { Brief, EditorialRule, Platform } from "@/types/domain";
import type { AiReference } from "./schema";

/** Retire les hashtags qui ne figurent pas dans la liste cochée par le CM. */
export function keepAllowedHashtags(text: string, allowed: readonly string[]): string {
  const permitted = new Set(allowed.map((tag) => tag.toLocaleLowerCase("fr-FR")));
  return text
    .replace(hashtagRegex(), (tag) => (permitted.has(tag.toLocaleLowerCase("fr-FR")) ? tag : ""))
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trimEnd())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/**
 * Mots courants pour le Fact Guard : texte fixe des modèles, mots vides, et tout mot
 * écrit en minuscules dans les références ou dans la sortie elle-même. Un mot qu'on
 * écrit en minuscules n'est pas un nom propre, même s'il apparaît en capitales ailleurs.
 */
export function aiVocabulary(texts: readonly string[]): Set<string> {
  const vocabulary = new Set<string>([...TEMPLATE_VOCABULARY, ...STOPWORDS_FR]);
  for (const text of texts) {
    for (const word of text.replace(hashtagRegex(), " ").match(/[\p{L}][\p{L}\p{M}'’-]*/gu) ?? []) {
      if (word === word.toLocaleLowerCase("fr-FR")) vocabulary.add(normalizeText(word));
    }
  }
  return vocabulary;
}

export interface AiPostProcessContext {
  brief: Brief;
  platform: Platform;
  rules: readonly EditorialRule[];
  facts: readonly string[];
  hashtags: readonly string[];
  broadcasters?: readonly string[];
  references: readonly AiReference[];
  lint: { frenchSpacing: boolean; emojiThreshold?: number; recentHooks: readonly string[] };
}

/**
 * Atelier Français (section 6.4) : les fautes sûres et la typographie d'une sortie IA sont
 * corrigées avant le post-traitement. Les faits du brief (noms, lieux) servent de
 * dictionnaire : ils ne sont jamais modifiés.
 */
export function correctFrench(
  text: string,
  ctx: Pick<AiPostProcessContext, "brief" | "facts" | "hashtags" | "broadcasters">,
) {
  const french = {
    dictionary: new Set(
      [...ctx.facts, ...ctx.hashtags].map((f) => f.trim().toLowerCase()).filter(Boolean),
    ),
    categoryId: ctx.brief.categoryId,
    mode: ctx.brief.mode,
    broadcasters: ctx.broadcasters,
  };
  const count = checkLocal(text, french).filter(isAutoFixable).length;
  return { text: count > 0 ? autoCorrect(text, french) : text, count };
}

export function processAiText(raw: string, ctx: AiPostProcessContext): PostProcessResult {
  const french = correctFrench(keepAllowedHashtags(raw, ctx.hashtags), ctx);
  const text = french.text;
  const result = postProcess(text, {
    lint: {
      rules: ctx.rules,
      categoryId: ctx.brief.categoryId,
      fields: ctx.brief.fields,
      frenchSpacing: ctx.lint.frenchSpacing,
      emojiThreshold: ctx.lint.emojiThreshold,
      recentHooks: ctx.lint.recentHooks,
    },
    platform: ctx.platform,
    allowed: buildAllowedFacts([...ctx.facts, ...ctx.hashtags]),
    vocabulary: aiVocabulary([text, ...ctx.references.map((r) => r.text)]),
    broadcasters: ctx.broadcasters,
    references: ctx.references.map((r) => ({ id: r.id, text: r.text })),
  });
  if (french.count === 0) return result;
  return {
    ...result,
    fixes: [
      {
        ruleId: "atelier-francais",
        label: "Fautes corrigées par l'Atelier Français",
        count: french.count,
      },
      ...result.fixes,
    ],
  };
}
