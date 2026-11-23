/**
 * Prompts des moteurs IA (section 11.3), construits en français depuis le brief, le
 * registre des catégories, les règles actives et le profil de style validé. Logique pure.
 */
import { z } from "zod";
import { getCategory, getField, type CategoryDef } from "@/lib/categories/registry";
import { RULE_IDS } from "@/lib/editorial/rules";
import { seedFor } from "@/lib/generation/random";
import { PLATFORM_RULES } from "@/lib/platforms/rules";
import type { Brief, EditorialRule, Platform, RefineAction } from "@/types/domain";
import {
  DeclineOutputSchema,
  RefineOutputSchema,
  VariantsWireSchema,
  type AiReference,
  type DeclineRequest,
  type GenerateRequest,
  type RefineRequest,
  type StyleSummary,
} from "./schema";

const MODE_LABELS = { live: "LIVE SHOW", daily: "DAILY & MEDIA" } as const;
const CONFIDENCE_LABELS = {
  insufficient: "insuffisante",
  low: "faible",
  medium: "moyenne",
  high: "élevée",
} as const;
const POSITION_LABELS = { end: "en fin de post", inline: "dans le texte", mixed: "variable" };

/** Règles déjà formulées ailleurs dans le prompt, ou internes à l'outil. */
const HANDLED_ELSEWHERE = new Set<string>([
  RULE_IDS.deHexagone,
  RULE_IDS.ceintureTitre,
  RULE_IDS.aiFormulas,
  RULE_IDS.noCopy,
  RULE_IDS.ctaLexicon,
  RULE_IDS.finalQuestion,
  RULE_IDS.sambaSima,
]);

/** Neutralise une balise fermante dans un contenu inséré entre balises. */
const inTag = (value: string) => value.replaceAll("</", "< /");
const bullets = (lines: readonly string[]) => lines.map((line) => `- ${line}`).join("\n");
const listOrNone = (items: readonly string[], none = "aucun") =>
  items.length > 0 ? items.join(" · ") : none;
const schemaOf = (schema: z.ZodType) => JSON.stringify(z.toJSONSchema(schema));

function requireCategory(brief: Brief): CategoryDef {
  const category = getCategory(brief.categoryId);
  if (!category || category.mode !== brief.mode) {
    throw new Error(`Catégorie inconnue pour ce mode : ${brief.categoryId}`);
  }
  return category;
}

export function platformConstraints(platform: Platform): string {
  const rule = PLATFORM_RULES[platform];
  const limit = `${rule.maxLength.toLocaleString("fr-FR")} caractères maximum`;
  switch (platform) {
    case "x":
      return `${rule.label} : ${limit} en comptage pondéré X (un emoji compte double, un lien 23). Vise moins de ${rule.warnAt}.`;
    case "instagram":
      return `${rule.label} : ${limit}, ${rule.maxHashtags} hashtags au plus. Seuls les ${rule.defaultTruncation} premiers caractères s'affichent avant « plus » : l'accroche doit y tenir.`;
    case "facebook":
      return `${rule.label} : le texte est coupé vers ${rule.defaultTruncation} caractères, l'essentiel doit venir avant.`;
    case "tiktok":
      return `${rule.label} : ${limit}. Accroche immédiate dès la première ligne.`;
  }
}

/** Règles éditoriales actives, formulées comme consignes (section 11.3). */
export function activeRuleLines(rules: readonly EditorialRule[], category: CategoryDef): string[] {
  const active = rules.filter((r) => r.enabled && !category.disabledRules?.includes(r.id));
  const lines: string[] = [];
  for (const rule of [...active].sort((a, b) => a.order - b.order)) {
    if (HANDLED_ELSEWHERE.has(rule.id)) continue;
    const values =
      rule.kind === "forbid" && rule.values?.length ? ` : ${rule.values.join(", ")}` : "";
    lines.push(`${rule.label}${values}.`.replace(/\.\.$/, "."));
  }
  const samba = active.find((r) => r.id === RULE_IDS.sambaSima);
  if (samba && category.context === "positive") {
    lines.push(
      "Si Samba Sima est cité, présente-le comme un crack, un jeune phénomène exceptionnel.",
    );
  } else if (category.context === "negative") {
    lines.push("Samba Sima n'est jamais qualifié de crack ou de phénomène dans ce contexte.");
  }
  const question = active.find((r) => r.id === RULE_IDS.finalQuestion);
  if (question?.values?.includes(category.id)) {
    lines.push("Aucune question en fin de post : cette catégorie est factuelle.");
  }
  return lines;
}

function aiFormulas(rules: readonly EditorialRule[]): string[] {
  const rule = rules.find((r) => r.id === RULE_IDS.aiFormulas && r.enabled);
  return rule?.values ?? [];
}

function styleBlock(style: StyleSummary): string {
  const header =
    style.source === "profile"
      ? `STYLE MESURÉ SUR LES PUBLICATIONS RÉELLES (${style.corpusSize} posts, confiance ${CONFIDENCE_LABELS[style.confidence ?? "low"]})`
      : "STYLE PAR DÉFAUT (aucun profil de style validé pour ce mode)";
  return [
    header,
    bullets([
      `Longueur médiane : ${Math.round(style.charsMedian)} caractères, ${Math.round(style.linesMedian)} lignes.`,
      `Emojis par post : ${style.emojisPerPostMedian} (fréquents : ${listOrNone(style.topEmojis)})`,
      `Structures fréquentes : ${listOrNone(style.fingerprints, "aucune")}`,
      `Patrons d'accroche : ${listOrNone(style.hookPatterns)}`,
      `CTA habituels : ${listOrNone(style.ctas)}`,
      `Hashtags : ${POSITION_LABELS[style.hashtagPosition]}.`,
    ]),
  ].join("\n");
}

/** Une question finale au plus une génération sur trois, seulement en DAILY non factuel. */
export function finalQuestionAllowed(brief: Brief, rules: readonly EditorialRule[]): boolean {
  if (brief.mode !== "daily") return false;
  const banned = rules.some(
    (r) => r.id === RULE_IDS.finalQuestion && r.enabled && r.values?.includes(brief.categoryId),
  );
  return !banned && seedFor(brief, 0) % 3 === 0;
}

function variantBlock(style: StyleSummary, brief: Brief, rules: readonly EditorialRule[]): string {
  const median = Math.round(style.charsMedian);
  const punchyMax = Math.min(280, Math.max(60, Math.round(style.charsMedian * 0.5)));
  const emojis = Math.round(style.emojisPerPostMedian);
  const question = finalQuestionAllowed(brief, rules)
    ? "une question finale est permise pour cette génération"
    : "pas de question finale";
  return [
    "PRODUIS TROIS VARIANTES VRAIMENT DIFFÉRENTES (structure et accroche différentes)",
    `1. punchy : ${punchyMax} caractères au plus. Structure accroche-corps (hashtags éventuels). 1 à 2 emojis. Accroche nominale, majuscules possibles. Jamais de question finale. Ni CTA ni signature.`,
    `2. signature : ${Math.round(median * 0.8)} à ${Math.round(median * 1.2)} caractères. Structure la plus fréquente du profil pour la catégorie. ${emojis} emoji(s) environ. Accroche sur un patron fréquent du profil. C'est la variante recommandée.`,
    `3. storytelling : entre ${median} et ${Math.round(style.charsP90)} caractères. Accroche, puis au moins deux paragraphes. ${emojis} emoji(s) environ. Angle différent : parcours, rivalité, enjeu. ${question[0]!.toUpperCase()}${question.slice(1)}.`,
  ].join("\n");
}

export function buildGenerateSystem(request: GenerateRequest): string {
  const { brief, rules, styleProfileSummary: style } = request;
  const category = requireCategory(brief);
  const avoid = [...style.overused, ...aiFormulas(rules)];
  return [
    "Tu rédiges des publications pour les réseaux sociaux de HEXAGONE MMA, ligue française de MMA.",
    `Mode : ${MODE_LABELS[brief.mode]}. Catégorie : ${category.label}. Plateforme : ${PLATFORM_RULES[request.platform].label}.`,
    "",
    "RÈGLES ABSOLUES",
    bullets([
      "N'utilise que les faits fournis dans <faits>. N'invente aucun résultat, score, palmarès, statistique, date, horaire, diffuseur, prix ou citation.",
      "Si une information manque, n'en parle pas.",
      "Écris « de HEXAGONE MMA », jamais « d'HEXAGONE MMA ». Exception : « la ceinture d'HEXAGONE MMA », « le titre d'HEXAGONE MMA ».",
      ...activeRuleLines(rules, category),
      "Les exemples de <references> servent uniquement à capter le ton, le rythme, la structure et le niveau d'emojis. Ne recopie aucune phrase.",
      `Évite : ${listOrNone(avoid, "rien de particulier")}.`,
      request.hashtags.length > 0
        ? "Hashtags : uniquement ceux de <hashtags_autorises>, sans en ajouter, pas forcément tous."
        : "N'ajoute aucun hashtag.",
      request.signature
        ? "Recopie <signature> telle quelle à la fin des variantes signature et storytelling, avant les hashtags."
        : "Pas de signature.",
    ]),
    "",
    styleBlock(style),
    "",
    `TON DE LA CATÉGORIE : ${category.tone}`,
    `CONTRAINTES PLATEFORME : ${platformConstraints(request.platform)}`,
    "",
    variantBlock(style, brief, rules),
    "",
    "Pour chaque variante : `hook` est la première ligne du texte, `usedFacts` liste les faits de <faits> que tu as utilisés.",
    `Réponds uniquement en JSON valide selon ce schéma : ${schemaOf(VariantsWireSchema)}`,
  ].join("\n");
}

/** Champs renseignés du brief, avec leur libellé, puis la consigne libre éventuelle. */
export function briefLines(brief: Brief): string[] {
  const lines: string[] = [];
  for (const [key, value] of Object.entries(brief.fields)) {
    if (value === undefined || value === "" || value === false) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    let label = key;
    try {
      label = getField(key).label;
    } catch {
      // Champ hors registre : on garde la clé.
    }
    const shown = Array.isArray(value) ? value.join(", ") : value === true ? "oui" : String(value);
    lines.push(`${label} : ${shown}`);
  }
  if (brief.cta?.trim()) lines.push(`CTA à utiliser : ${brief.cta.trim()}`);
  if (brief.freeInstruction?.trim()) lines.push(`Consigne du CM : ${brief.freeInstruction.trim()}`);
  return lines;
}

function referencesBlock(references: readonly AiReference[]): string {
  const items = references.map((r) => {
    const attrs = [
      r.categoryId ? ` categorie="${inTag(r.categoryId)}"` : "",
      r.date ? ` date="${inTag(r.date)}"` : "",
    ].join("");
    return `  <reference${attrs}>${inTag(r.text)}</reference>`;
  });
  return ["<references>", ...items, "</references>"].join("\n");
}

export function buildGenerateUser(request: GenerateRequest): string {
  return [
    `<faits>${inTag(JSON.stringify(request.facts))}</faits>`,
    `<brief>\n${inTag(briefLines(request.brief).join("\n"))}\n</brief>`,
    referencesBlock(request.references),
    `<hashtags_autorises>${inTag(request.hashtags.join(" "))}</hashtags_autorises>`,
    `<signature>${inTag(request.signature ?? "")}</signature>`,
  ].join("\n");
}

// ---------------------------------------------------------------------------
// Retouche et déclinaison
// ---------------------------------------------------------------------------

export const REFINE_INSTRUCTIONS: Record<RefineAction, string> = {
  shorten: "Raccourcis le texte : retire d'abord les détails secondaires, puis l'appel à l'action.",
  punchier: "Rends le texte plus percutant : accroche plus forte, phrases de 15 mots au plus.",
  institutional:
    "Rends le ton plus institutionnel et sobre : un emoji au plus, pas d'exclamation en série.",
  new_hook:
    "Propose une nouvelle accroche. Ne change que la première ligne, recopie le reste à l'identique.",
  toggle_emojis:
    "Si le texte contient des emojis, retire-les tous. Sinon, ajoute-en quelques-uns, sans surcharge.",
  rephrase: "Reformule chaque phrase en gardant la même structure et les mêmes informations.",
  regenerate:
    "Réécris entièrement le texte avec une autre accroche et une autre structure, à partir des mêmes faits.",
  custom: "Applique la consigne du CM.",
};

const RETOUCH_RULE =
  "Ne modifie que ce qui est demandé. Conserve toutes les informations factuelles.";

function shortSystem(
  brief: Brief,
  rules: readonly EditorialRule[],
  platform: Platform,
  task: string,
) {
  const category = requireCategory(brief);
  return [
    "Tu retouches des publications pour les réseaux sociaux de HEXAGONE MMA, ligue française de MMA.",
    `Mode : ${MODE_LABELS[brief.mode]}. Catégorie : ${category.label}.`,
    "",
    "RÈGLES ABSOLUES",
    bullets([
      "N'utilise que les faits fournis dans <faits>. N'invente aucun résultat, score, palmarès, statistique, date, horaire, diffuseur, prix ou citation.",
      "Écris « de HEXAGONE MMA », jamais « d'HEXAGONE MMA ». Exception : « la ceinture d'HEXAGONE MMA », « le titre d'HEXAGONE MMA ».",
      ...activeRuleLines(rules, category),
      `Évite : ${listOrNone(aiFormulas(rules), "rien de particulier")}.`,
    ]),
    "",
    `TON DE LA CATÉGORIE : ${category.tone}`,
    `CONTRAINTES PLATEFORME : ${platformConstraints(platform)}`,
    "",
    task,
  ].join("\n");
}

export function buildRefinePrompt(request: RefineRequest): { system: string; user: string } {
  const system = shortSystem(
    request.brief,
    request.rules,
    request.brief.platform,
    `${RETOUCH_RULE}\nRéponds uniquement en JSON valide selon ce schéma : ${schemaOf(RefineOutputSchema)}`,
  );
  const user = [
    `<faits>${inTag(JSON.stringify(request.facts))}</faits>`,
    `<texte>${inTag(request.text)}</texte>`,
    `<action>${REFINE_INSTRUCTIONS[request.action]}</action>`,
    `<consigne>${inTag(request.instruction?.trim() ?? "")}</consigne>`,
    `<hashtags_autorises>${inTag(request.hashtags.join(" "))}</hashtags_autorises>`,
  ].join("\n");
  return { system, user };
}

export function buildDeclinePrompt(request: DeclineRequest): { system: string; user: string } {
  const targets = request.targets.map((p) => `- ${platformConstraints(p)}`).join("\n");
  const system = shortSystem(
    request.brief,
    request.rules,
    request.brief.platform,
    [
      `Adapte le texte pour chaque plateforme demandée, sans ajouter d'information.\n${targets}`,
      `${RETOUCH_RULE}`,
      `Réponds uniquement en JSON valide selon ce schéma : ${schemaOf(DeclineOutputSchema)}`,
    ].join("\n"),
  );
  const user = [
    `<faits>${inTag(JSON.stringify(request.facts))}</faits>`,
    `<texte plateforme="${request.brief.platform}">${inTag(request.text)}</texte>`,
    `<plateformes>${request.targets.join(", ")}</plateformes>`,
    `<hashtags_autorises>${inTag(request.hashtags.join(" "))}</hashtags_autorises>`,
  ].join("\n");
  return { system, user };
}
