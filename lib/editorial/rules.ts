/**
 * Règles éditoriales intégrées (section 1.6) et valeurs par défaut du style.
 *
 * Les règles sont copiées en base au premier lancement (seed) puis modifiables par
 * un administrateur. Les règles de remplacement sont entièrement décrites par leur
 * motif : le linter les applique telles qu'elles sont stockées, dans l'ordre `order`.
 */
import type { EditorialRule } from "@/types/domain";

export const RULE_IDS = {
  brandCase: "rule-brand-case",
  deHexagone: "rule-de-hexagone",
  ceintureTitre: "rule-ceinture-titre",
  hashtagDuplicates: "rule-hashtag-duplicates",
  frenchSpacing: "rule-french-spacing",
  sambaSima: "rule-samba-sima",
  aiFormulas: "rule-ai-formulas",
  aiOpeningVeritable: "rule-ai-opening-veritable",
  emojiOverload: "rule-emoji-overload",
  repetitiveHooks: "rule-repetitive-hooks",
  finalQuestion: "rule-final-question",
  noHashtagSpam: "rule-no-hashtag-spam",
  noCopy: "rule-no-copy",
} as const;

/** Valeurs utilisées quand le profil de style du mode est insuffisant (moins de 5 posts). */
export const STYLE_DEFAULTS = {
  /** Seuil d'alerte « trop d'emojis » (section 7.4). */
  emojiThreshold: 6,
  /** Similarité d'accroche (Jaccard sur les mots) à partir de laquelle on alerte. */
  hookSimilarityThreshold: 0.7,
  /** Nombre de générations validées récentes comparées à la nouvelle accroche. */
  recentHooksWindow: 20,
} as const;

/** Indices de défaite : la règle Samba Sima ne s'applique pas si le texte en contient. */
export const DEFEAT_LEXICON = [
  "defaite",
  "s'incline",
  "s'est incline",
  "battu",
  "perd ",
  "a perdu",
  "revers",
] as const;

/** Lettre, chiffre ou tiret bas : délimite un mot, accents compris (`\b` ne les gère pas). */
const WORD_CHAR = "[\\p{L}\\p{N}_]";

export const DEFAULT_EDITORIAL_RULES: readonly EditorialRule[] = [
  {
    id: RULE_IDS.brandCase,
    label: "Nom de la ligue toujours écrit HEXAGONE MMA (hors hashtags)",
    kind: "replace",
    pattern: `(?<![#@]|${WORD_CHAR})hexagone[ \\u00A0]+mma(?!${WORD_CHAR})`,
    flags: "giu",
    replacement: "HEXAGONE MMA",
    order: 10,
    enabled: true,
    editableBy: "admin",
  },
  {
    id: RULE_IDS.deHexagone,
    label: "Écrire « de HEXAGONE MMA », jamais « d'HEXAGONE MMA »",
    description:
      "Sauf si « ceinture » ou « titre » figure dans les 3 mots qui précèdent (« la ceinture d'HEXAGONE MMA »).",
    kind: "replace",
    pattern: `(?<!(?:^|[^\\p{L}])(?:ceintures?|titres?)(?:\\s+\\S+){0,2}\\s+)(?<!${WORD_CHAR})([dD])['’]HEXAGONE MMA(?!${WORD_CHAR})`,
    flags: "giu",
    replacement: "$1e HEXAGONE MMA",
    order: 20,
    enabled: true,
    editableBy: "admin",
  },
  {
    id: RULE_IDS.ceintureTitre,
    label: "Exception : « la ceinture d'HEXAGONE MMA », « le titre d'HEXAGONE MMA »",
    kind: "replace",
    pattern: `(?<!${WORD_CHAR})(ceintures?|titres?) de HEXAGONE MMA(?!${WORD_CHAR})`,
    flags: "giu",
    replacement: "$1 d'HEXAGONE MMA",
    order: 30,
    enabled: true,
    editableBy: "admin",
  },
  {
    id: RULE_IDS.hashtagDuplicates,
    label: "Pas de hashtag en double",
    kind: "contextual",
    order: 40,
    enabled: true,
    editableBy: "admin",
  },
  {
    id: RULE_IDS.frenchSpacing,
    label: "Espace insécable avant ! ? : ; et pas d'espace double",
    description: "L'espace insécable se désactive dans Préférences.",
    kind: "contextual",
    order: 50,
    enabled: true,
    editableBy: "admin",
  },
  {
    id: RULE_IDS.sambaSima,
    label: "Samba Sima présenté comme un crack en contexte positif, jamais en contexte de défaite",
    description:
      "Victoire, présentation, annonce, titre : il est présenté comme un crack, un jeune phénomène exceptionnel. Qualificatifs reconnus : liste ci-dessous.",
    kind: "contextual",
    values: ["crack", "phénomène", "pépite", "prodige"],
    order: 60,
    enabled: true,
    editableBy: "admin",
  },
  {
    id: RULE_IDS.aiFormulas,
    label: "Pas de formules typiques d'IA",
    kind: "forbid",
    values: [
      "Dans un monde",
      "Il est important de noter",
      "Il convient de noter",
      "Cette initiative vise à",
      "Plongez dans",
      "N'hésitez pas à",
      "Préparez-vous à vivre",
      "Plus qu'un simple",
      "Bien plus qu'un",
      "Que vous soyez",
      "Dans le paysage",
    ],
    order: 70,
    enabled: true,
    editableBy: "admin",
  },
  {
    id: RULE_IDS.aiOpeningVeritable,
    label: "Pas de « véritable » en ouverture",
    kind: "forbid",
    pattern: "^[^\\p{L}]*v[eé]ritable(?![\\p{L}])",
    flags: "iu",
    order: 71,
    enabled: true,
    editableBy: "admin",
  },
  {
    id: RULE_IDS.emojiOverload,
    label: "Pas de surcharge d'emojis",
    description:
      "Seuil : p90 du profil de style du mode, 6 par défaut si le profil est insuffisant.",
    kind: "contextual",
    order: 80,
    enabled: true,
    editableBy: "admin",
  },
  {
    id: RULE_IDS.repetitiveHooks,
    label: "Pas d'accroche répétitive",
    description:
      "Alerte si l'accroche est identique ou trop proche (Jaccard ≥ 0,7 sur les mots) de l'une des 20 dernières générations validées.",
    kind: "contextual",
    order: 90,
    enabled: true,
    editableBy: "admin",
  },
  {
    id: RULE_IDS.finalQuestion,
    label: "Pas de question finale sur les catégories factuelles",
    description: "Catégories concernées : liste ci-dessous.",
    kind: "forbid",
    values: ["live_result", "live_ko", "live_sub", "live_decision", "live_defeat"],
    order: 100,
    enabled: true,
    editableBy: "admin",
  },
  {
    id: RULE_IDS.noHashtagSpam,
    label: "Pas de hashtags systématiques ni de ton publicitaire sur chaque post",
    description: "Consigne transmise aux moteurs de génération.",
    kind: "contextual",
    order: 110,
    enabled: true,
    editableBy: "admin",
  },
  {
    id: RULE_IDS.noCopy,
    label: "Les références ne sont jamais recopiées textuellement",
    description: "Contrôlé par l'anti-copie des moteurs (Phase 5).",
    kind: "contextual",
    order: 120,
    enabled: true,
    editableBy: "admin",
  },
];

export const BUILTIN_RULE_IDS: ReadonlySet<string> = new Set(
  DEFAULT_EDITORIAL_RULES.map((rule) => rule.id),
);

/** Tri d'application : `order` croissant, puis identifiant. */
export function sortRules(rules: readonly EditorialRule[]): EditorialRule[] {
  return [...rules].sort((a, b) => a.order - b.order || a.id.localeCompare(b.id));
}
