/**
 * Données initiales, écrites une seule fois (version suivie dans `meta.seedVersion`).
 * Les identifiants sont fixes : relancer le seed n'ajoute aucun doublon.
 */
import {
  DEFAULT_USER_ID,
  SettingsSchema,
  type EditorialRule,
  type Fighter,
  type HashtagGroup,
  type Signature,
  type UserProfile,
  type Wording,
} from "@/types/domain";
import { CURRENT_SCHEMA_VERSION } from "./migrations";
import type { DataRepository } from "./repository";
import { createWording, type WordingInput } from "./wording-factory";

export const SEED_VERSION = 1;

export const DEMO_BADGE = "EXEMPLE FICTIF : À REMPLACER PAR UNE PUBLICATION OFFICIELLE";

const DEMO_NOTE =
  "Exemple fictif créé au premier lancement. Combattants et médias inventés. À remplacer par une publication officielle.";

/** Six publications fictives : trois LIVE SHOW, trois DAILY & MEDIA, structures différentes. */
const DEMO_WORDINGS: WordingInput[] = [
  {
    id: "demo-live-ko",
    mode: "live",
    categoryId: "live_ko",
    platform: "instagram",
    source: "demo",
    text: [
      "💥 KO AU PREMIER ROUND !",
      "",
      "Yanis Fictif n'a laissé aucune chance à Bruno Exemple.",
      "Une droite, et c'est terminé.",
      "",
      "#HexagoneMMA",
    ].join("\n"),
  },
  {
    id: "demo-live-champion",
    mode: "live",
    categoryId: "live_champion",
    platform: "instagram",
    source: "demo",
    text: [
      "🏆 NOUVEAU CHAMPION !",
      "",
      "Hugo Démo s'empare de la ceinture d'HEXAGONE MMA des poids légers face à Karim Modèle.",
      "Cinq rounds d'une intensité folle, et une victoire par décision unanime.",
      "",
      "Le règne commence ce soir.",
      "",
      "#HexagoneMMA",
    ].join("\n"),
  },
  {
    id: "demo-live-reaction",
    mode: "live",
    categoryId: "live_reaction",
    platform: "instagram",
    source: "demo",
    text: [
      "🎤 « Je rêvais de ce moment depuis mes débuts. Ce soir, tout le travail a payé. »",
      "",
      "Lucas Témoin, à chaud après sa victoire.",
      "",
      "#HexagoneMMA",
    ].join("\n"),
  },
  {
    id: "demo-daily-fight-announce",
    mode: "daily",
    categoryId: "daily_fight_announce",
    platform: "instagram",
    source: "demo",
    cta: "Prenez vos places dès maintenant !",
    text: [
      "📢 COMBAT OFFICIEL",
      "",
      "Enzo Factice affrontera Théo Exemple lors du prochain gala de HEXAGONE MMA.",
      "Un grappler redoutable face à un striker explosif chez les poids welters : le choc des styles est annoncé.",
      "",
      "🎫 Prenez vos places dès maintenant !",
      "(Lien en bio du profil)",
      "",
      "#HexagoneMMA #MMAFrance",
    ].join("\n"),
  },
  {
    id: "demo-daily-press",
    mode: "daily",
    categoryId: "media_press",
    platform: "instagram",
    source: "demo",
    cta: "L'interview complète est à lire via le lien en bio.",
    text: [
      "📰 Nina Exemple se confie au Journal Fictif.",
      "",
      "Sa préparation, ses ambitions et ce qu'elle attend de son prochain combat sous les couleurs de HEXAGONE MMA.",
      "",
      "L'interview complète est à lire via le lien en bio.",
      "",
      "#HexagoneMMA",
    ].join("\n"),
  },
  {
    id: "demo-daily-ticketing",
    mode: "daily",
    categoryId: "daily_ticketing",
    platform: "instagram",
    source: "demo",
    cta: "Prenez vos places dès maintenant !",
    text: [
      "🎟️ LA BILLETTERIE EST OUVERTE",
      "",
      "La prochaine soirée de HEXAGONE MMA se prépare.",
      "Venez vivre les combats au plus près de la cage.",
      "",
      "🎫 Prenez vos places dès maintenant !",
      "(Lien en bio du profil)",
      "",
      "#HexagoneMMA",
    ].join("\n"),
  },
];

const HASHTAG_GROUPS: HashtagGroup[] = [
  {
    id: "hashtags-official",
    name: "Officiel",
    kind: "official",
    tags: ["#HexagoneMMA"],
    defaultOn: true,
    modes: ["live", "daily"],
    order: 0,
  },
  {
    id: "hashtags-mma-france",
    name: "MMA France",
    kind: "mma_france",
    tags: ["#MMAFrance", "#MMA", "#CombatSports"],
    defaultOn: false,
    modes: ["live", "daily"],
    order: 1,
  },
];

const SIGNATURES: Signature[] = [
  {
    id: "signature-event",
    name: "Signature événementielle",
    template: [
      "🗓️ {date} - {venue}, {city}",
      "📺 En direct sur {broadcaster}",
      "🎫 Prenez vos places dès maintenant !",
      "(Lien en bio du profil)",
    ].join("\n"),
    requiredFields: ["date", "venue", "city"],
    requiresConfirmedSchedule: false,
    modes: ["daily", "live"],
    enabled: true,
    order: 0,
  },
  {
    id: "signature-broadcast",
    name: "Diffusion détaillée",
    template:
      "📺 En direct à partir de {prelimsTime} sur {prelimsChannel} et à partir de {mainTime} pour la carte principale sur {mainChannel}",
    requiredFields: ["prelimsTime", "prelimsChannel", "mainTime", "mainChannel"],
    requiresConfirmedSchedule: true,
    modes: ["daily", "live"],
    enabled: true,
    order: 1,
  },
];

/** Règles de la section 1.6. Le linter (Phase 2) s'appuie sur ces identifiants. */
const RULES: EditorialRule[] = [
  {
    id: "rule-de-hexagone",
    label: "Écrire « de HEXAGONE MMA », jamais « d'HEXAGONE MMA »",
    description: "Sauf après « ceinture » ou « titre » (fenêtre de 3 mots).",
    kind: "replace",
    pattern: "\\bd['’]HEXAGONE MMA\\b",
    flags: "gu",
    replacement: "de HEXAGONE MMA",
    enabled: true,
    editableBy: "admin",
  },
  {
    id: "rule-ceinture-titre",
    label: "Exception : « la ceinture d'HEXAGONE MMA », « le titre d'HEXAGONE MMA »",
    kind: "replace",
    pattern: "\\b(ceinture|titre) de HEXAGONE MMA\\b",
    flags: "gu",
    replacement: "$1 d'HEXAGONE MMA",
    enabled: true,
    editableBy: "admin",
  },
  {
    id: "rule-brand-case",
    label: "Nom de la ligue toujours écrit HEXAGONE MMA (hors hashtags)",
    kind: "replace",
    pattern: "(?<!#)\\bhexagone mma\\b",
    flags: "giu",
    replacement: "HEXAGONE MMA",
    enabled: true,
    editableBy: "admin",
  },
  {
    id: "rule-hashtag-duplicates",
    label: "Pas de hashtag en double",
    kind: "contextual",
    enabled: true,
    editableBy: "admin",
  },
  {
    id: "rule-french-spacing",
    label: "Espace insécable avant ! ? : ; et pas d'espace double",
    kind: "contextual",
    enabled: true,
    editableBy: "admin",
  },
  {
    id: "rule-samba-sima",
    label: "Samba Sima présenté comme un crack en contexte positif, jamais en contexte de défaite",
    description:
      "Victoire, présentation, annonce, titre : il est présenté comme un crack, un jeune phénomène exceptionnel.",
    kind: "contextual",
    values: ["crack", "phénomène", "pépite", "prodige"],
    enabled: true,
    editableBy: "admin",
  },
  {
    id: "rule-ai-formulas",
    label: "Pas de formules typiques d'IA",
    description: "« Véritable » est aussi interdit en ouverture de post.",
    kind: "forbid",
    values: [
      "Dans un monde",
      "Il est important de noter",
      "Cette initiative vise à",
      "Plongez dans",
      "N'hésitez pas à",
      "Préparez-vous à vivre",
    ],
    enabled: true,
    editableBy: "admin",
  },
  {
    id: "rule-ai-opening-veritable",
    label: "Pas de « véritable » en ouverture",
    kind: "forbid",
    pattern: "^[^\\p{L}]*véritable\\b",
    flags: "iu",
    enabled: true,
    editableBy: "admin",
  },
  {
    id: "rule-emoji-overload",
    label: "Pas de surcharge d'emojis",
    description:
      "Seuil : p90 du profil de style du mode, 6 par défaut si le profil est insuffisant.",
    kind: "contextual",
    enabled: true,
    editableBy: "admin",
  },
  {
    id: "rule-repetitive-hooks",
    label: "Pas d'accroche répétitive",
    description: "Alerte si l'accroche ressemble à l'une des 20 dernières générations validées.",
    kind: "contextual",
    enabled: true,
    editableBy: "admin",
  },
  {
    id: "rule-final-question",
    label: "Pas de question finale sur les catégories factuelles",
    kind: "forbid",
    values: ["live_result", "live_ko", "live_sub", "live_decision", "live_defeat"],
    enabled: true,
    editableBy: "admin",
  },
  {
    id: "rule-no-hashtag-spam",
    label: "Pas de hashtags systématiques ni de ton publicitaire sur chaque post",
    kind: "contextual",
    enabled: true,
    editableBy: "admin",
  },
  {
    id: "rule-no-copy",
    label: "Les références ne sont jamais recopiées textuellement",
    kind: "contextual",
    enabled: true,
    editableBy: "admin",
  },
];

const DEFAULT_USER: UserProfile = { id: DEFAULT_USER_ID, name: "Community Manager", role: "admin" };

export interface SeedData {
  wordings: Wording[];
  fighters: Fighter[];
  hashtagGroups: HashtagGroup[];
  signatures: Signature[];
  rules: EditorialRule[];
  users: UserProfile[];
}

/** Construit les données initiales (calcul des hash inclus). Pur, sans écriture. */
export async function buildSeedData(now: Date = new Date()): Promise<SeedData> {
  const wordings = await Promise.all(
    DEMO_WORDINGS.map((input) =>
      createWording(
        { ...input, isDemo: true, isReference: false, tags: ["exemple"], internalNotes: DEMO_NOTE },
        now,
      ),
    ),
  );

  const sambaSima: Fighter = {
    id: "fighter-samba-sima",
    firstName: "Samba",
    lastName: "Sima",
    fightHistory: [],
    editorialNotes:
      "Règle éditoriale : en contexte positif (victoire, présentation, annonce, titre), présenter Samba Sima comme un crack, un jeune phénomène exceptionnel. Jamais en contexte de défaite.",
    updatedAt: now.toISOString(),
  };

  return {
    wordings,
    fighters: [sambaSima],
    hashtagGroups: HASHTAG_GROUPS,
    signatures: SIGNATURES,
    rules: RULES,
    users: [DEFAULT_USER],
  };
}

export interface SeedResult {
  ran: boolean;
  seedVersion: number;
}

/**
 * Écrit les données initiales si elles ne l'ont jamais été.
 * La vérification et l'écriture se font dans une même transaction :
 * deux onglets ouverts au premier lancement ne produisent pas de doublon.
 */
export async function runSeed(
  repository: DataRepository,
  now: Date = new Date(),
): Promise<SeedResult> {
  const current = await repository.getMeta("seedVersion");
  if (current !== undefined && current >= SEED_VERSION) {
    return { ran: false, seedVersion: current };
  }

  // Calculs asynchrones (hash) avant la transaction : IndexedDB ne tolère pas d'attente externe.
  const data = await buildSeedData(now);

  return repository.transaction(async () => {
    const again = await repository.getMeta("seedVersion");
    if (again !== undefined && again >= SEED_VERSION) {
      return { ran: false, seedVersion: again };
    }
    await repository.wordings.bulkPut(data.wordings);
    await repository.fighters.bulkPut(data.fighters);
    await repository.hashtagGroups.bulkPut(data.hashtagGroups);
    await repository.signatures.bulkPut(data.signatures);
    await repository.rules.bulkPut(data.rules);
    await repository.users.bulkPut(data.users);
    if ((await repository.getMeta("settings")) === undefined) {
      await repository.setMeta("settings", SettingsSchema.parse({}));
    }
    await repository.setMeta("schemaVersion", CURRENT_SCHEMA_VERSION);
    await repository.setMeta("seedVersion", SEED_VERSION);
    return { ran: true, seedVersion: SEED_VERSION };
  });
}
