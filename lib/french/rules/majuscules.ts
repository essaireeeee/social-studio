/** Majuscules et règle de la marque (section 6.3, niveaux 1 et 2). */
import { DAYS, MEDIA_NAMES, MONTHS, NATIONALITY_ADJECTIVES, PEOPLES } from "../lexicon";
import { AP, B, E, S, SENTENCE_START, alt } from "../text";
import type { FrenchMatch } from "../types";
import { fromTable, r, regex, rule } from "./helpers";

const base = { family: "majuscules", level: 1, severity: "error", confidence: "high" } as const;
const brand = { family: "marque", level: 1, severity: "error", confidence: "high" } as const;
const capitalized = (list: readonly string[]) =>
  list.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("|");
const toLower = (m: RegExpExecArray) => m[0].toLowerCase();
const WORD = "[\\p{L}\\p{N}_]";

/** Lettre précédente significative (hors espaces, emojis), ou "" en début de texte. */
function previousLineEnd(text: string, lineStart: number): string {
  const before = text.slice(0, lineStart).replace(/[\s\p{Extended_Pictographic}️‍]+$/u, "");
  return before.slice(-1);
}

export const MAJUSCULE_RULES = [
  rule({
    ...base,
    id: "maj-peuple",
    title: "Majuscule aux noms de peuples : les Français",
    explanation:
      "Le nom qui désigne un peuple prend une majuscule : les Français, deux Brésiliens. L'adjectif, lui, reste en minuscule (le MMA français).",
    examples: [
      { wrong: "Les français ont dominé la soirée.", right: "Les Français ont dominé la soirée." },
      { wrong: "Deux brésiliens à l'affiche.", right: "Deux Brésiliens à l'affiche." },
    ],
    alsoRight: ["Les combattants français.", "Les Français."],
    detect: regex(
      r`(?<=${B}(?:les|des|aux|nos|ces|deux|trois|plusieurs)${S})(?:${Object.keys(PEOPLES).join("|")})(?=${E})`,
      fromTable(PEOPLES),
    ),
  }),
  rule({
    ...base,
    id: "maj-adjectif-nationalite",
    title: "Minuscule à l'adjectif de nationalité : le MMA français",
    explanation:
      "Employé comme adjectif après un nom, le mot de nationalité s'écrit en minuscule : le MMA français, un combattant brésilien. Seul le nom de peuple prend la majuscule.",
    examples: [
      {
        wrong: "Le MMA Français est en pleine forme.",
        right: "Le MMA français est en pleine forme.",
      },
      {
        wrong: "Un combattant Brésilien redoutable.",
        right: "Un combattant brésilien redoutable.",
      },
    ],
    alsoRight: ["Le MMA français.", "Les Français."],
    detect: regex(
      r`(?<=${B}(?:MMA|combattant|combattants|combattante|champion|championne|public|scène|circuit|athlète|athlètes|boxe|lutte|judo|drapeau|titre|espoir|prodige|talent)${S})(?:${alt(NATIONALITY_ADJECTIVES)})(?=${E})`,
      toLower,
      { flags: "gu" },
    ),
  }),
  rule({
    ...base,
    id: "maj-jours",
    title: "Jours en minuscule",
    explanation:
      "En français, les jours de la semaine s'écrivent en minuscule : rendez-vous samedi. Seul le début de phrase prend une majuscule.",
    examples: [
      { wrong: "Rendez-vous Samedi à Paris.", right: "Rendez-vous samedi à Paris." },
      { wrong: "Le combat aura lieu ce Vendredi.", right: "Le combat aura lieu ce vendredi." },
    ],
    alsoRight: ["Samedi, la cage s'ouvre.", "Rendez-vous samedi."],
    detect: regex(r`(?<=[\p{Ll}\p{N},][   ]+)(?:${capitalized(DAYS)})(?=${E})`, toLower, {
      flags: "gu",
    }),
  }),
  rule({
    ...base,
    id: "maj-mois",
    title: "Mois en minuscule",
    explanation:
      "Les mois s'écrivent en minuscule : le 14 mars, en juin. Une majuscule n'apparaît qu'en début de phrase.",
    examples: [
      { wrong: "Le gala du 14 Mars.", right: "Le gala du 14 mars." },
      {
        wrong: "Rendez-vous en Juin pour la revanche.",
        right: "Rendez-vous en juin pour la revanche.",
      },
    ],
    alsoRight: ["Le 14 mars.", "Mars, la planète rouge."],
    detect: regex(r`(?<=[\p{Ll}\p{N},][   ]+)(?:${capitalized(MONTHS)})(?=${E})`, toLower, {
      flags: "gu",
    }),
  }),
  rule({
    ...base,
    id: "maj-debut-phrase",
    title: "Majuscule en début de phrase",
    explanation:
      "Après un point, un point d'exclamation ou d'interrogation, la phrase suivante commence par une majuscule. Les points de suspension n'imposent rien.",
    examples: [
      { wrong: "Il a gagné. la salle explose.", right: "Il a gagné. La salle explose." },
      {
        wrong: "Quel combat ! le public est debout.",
        right: "Quel combat ! Le public est debout.",
      },
    ],
    alsoRight: ["Il a gagné… la salle explose.", "Il a gagné, etc. ensuite on verra."],
    detect: regex(
      r`(?<=(?<![.\d]|${B}(?:etc|vs|cf|env|M|p))[.!?][   ]+)\p{Ll}`,
      (m) => m[0].toUpperCase(),
      { flags: "gu", keepCase: false },
    ),
  }),
  rule({
    ...base,
    id: "maj-debut-texte",
    title: "Majuscule en début de texte",
    explanation:
      "Un texte commence par une majuscule, y compris après un emoji en début de ligne. C'est la première lettre que l'on voit dans le fil.",
    examples: [
      { wrong: "le main event est officiel.", right: "Le main event est officiel." },
      { wrong: "💥 quel KO !", right: "💥 Quel KO !" },
    ],
    alsoRight: ["Le main event est officiel.", "#HexagoneMMA en force."],
    detect: regex(r`(?<=^[ \t \p{Extended_Pictographic}️‍]*)\p{Ll}`, (m) => m[0].toUpperCase(), {
      flags: "gu",
      keepCase: false,
    }),
  }),
  rule({
    ...base,
    id: "maj-debut-ligne",
    level: 2,
    severity: "warning",
    confidence: "medium",
    title: "Majuscule en début de ligne après une phrase terminée",
    explanation:
      "Quand la ligne précédente se termine par un point, un point d'exclamation ou un emoji, la nouvelle ligne commence une phrase : majuscule. Une ligne qui prolonge la phrase garde sa minuscule.",
    examples: [
      {
        wrong: "Quel combat !\nle public est debout.",
        right: "Quel combat !\nLe public est debout.",
      },
      {
        wrong: "KO au premier round.\n\nkarim revient fort.",
        right: "KO au premier round.\n\nKarim revient fort.",
      },
    ],
    alsoRight: ["Il frappe,\npuis il recule."],
    detect: (text) => {
      const out: FrenchMatch[] = [];
      for (const m of text.matchAll(/\n[ \t \p{Extended_Pictographic}️‍]*(\p{Ll})/gu)) {
        const at = m.index + m[0].length - 1;
        const lineStart = m.index + 1;
        const end = previousLineEnd(text, lineStart);
        if (
          end &&
          !/[.!?…:»)]/u.test(end) &&
          !/\p{Extended_Pictographic}/u.test(text.slice(m.index - 4, m.index))
        )
          continue;
        out.push({ start: at, end: at + 1, replacement: m[1]!.toUpperCase() });
      }
      return out;
    },
  }),
  rule({
    ...base,
    id: "maj-a-accent",
    title: "« À » avec accent en majuscule",
    explanation:
      "La majuscule garde l'accent : À suivre, À partir de 19h. « A suivre » se lit comme le verbe avoir.",
    examples: [
      { wrong: "A suivre !", right: "À suivre !" },
      {
        wrong: "A partir de 19h, ouverture des portes.",
        right: "À partir de 19h, ouverture des portes.",
      },
    ],
    alsoRight: ["À suivre !", "Il a suivi."],
    detect: regex(
      r`${SENTENCE_START}A(?=${S}(?:(?:suivre|nouveau|partir|bientôt|venir|samedi|dimanche|ce soir|demain|vous|domicile|Paris)${E}|l${AP}affiche))`,
      "À",
      { flags: "gmu", keepCase: false },
    ),
  }),
  rule({
    ...base,
    id: "maj-accents",
    severity: "warning",
    title: "Accents sur les majuscules : Équipe, État",
    explanation:
      "En français, les majuscules gardent leurs accents : Équipe de France, Évidemment. L'accent évite les confusions de lecture.",
    examples: [
      { wrong: "Equipe de France de MMA.", right: "Équipe de France de MMA." },
      { wrong: "Evidemment, il sera là.", right: "Évidemment, il sera là." },
    ],
    alsoRight: ["Équipe de France.", "Elle est là."],
    detect: regex(
      r`${B}(?:Etat|Etats|Equipe|Evenement|Evénement|Epreuve|Etape|Ecole|Election|Energie|Echec|Edition|Elite|Evidemment|Egalement)(?=${E})`,
      (m) => `É${m[0].slice(1).replace(/^venement/, "vénement")}`,
      { flags: "gu", keepCase: false },
    ),
  }),
  rule({
    ...base,
    id: "maj-medias",
    level: 2,
    title: "Noms de médias et d'émissions : graphie officielle",
    explanation:
      "Les noms de chaînes, de journaux et d'émissions s'écrivent comme la marque les écrit : RMC Sport, Canal+, beIN Sports. Les diffuseurs des fiches événements comptent aussi.",
    examples: [
      { wrong: "En direct sur rmc sport.", right: "En direct sur RMC Sport." },
      { wrong: "Diffusion sur canal+ dès 21h.", right: "Diffusion sur Canal+ dès 21h." },
    ],
    alsoRight: ["En direct sur RMC Sport.", "L'équipe du coach.", "EN DIRECT SUR RMC SPORT !"],
    ignoreDictionary: true,
    detect: (text, ctx) => {
      const names = [
        ...new Set([...MEDIA_NAMES.filter((n) => n !== "L'Équipe"), ...ctx.broadcasters]),
      ]
        .filter((n) => n.length >= 3)
        .sort((a, b) => b.length - a.length);
      const out: FrenchMatch[] = [];
      for (const name of names) {
        const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const re = new RegExp(`(?<!${WORD})${escaped}(?!${WORD}|\\+)`, "giu");
        for (const m of text.matchAll(re)) {
          if (m[0] === name) continue;
          // Tout en capitales : choix de mise en forme (accroche, brief), pas une faute.
          if (m[0] === m[0].toUpperCase()) continue;
          if (out.some((o) => m.index < o.end && o.start < m.index + m[0].length)) continue;
          out.push({ start: m.index, end: m.index + m[0].length, replacement: name });
        }
      }
      return out;
    },
  }),
  rule({
    ...base,
    id: "maj-sigles",
    title: "Sigles en capitales : MMA, KO, TKO",
    explanation:
      "Les sigles s'écrivent en capitales : MMA, KO, TKO. En minuscules, ils se lisent mal et paraissent négligés.",
    examples: [
      { wrong: "Le mma français grandit.", right: "Le MMA français grandit." },
      { wrong: "Victoire par ko au premier round.", right: "Victoire par KO au premier round." },
    ],
    alsoRight: ["Le MMA français.", "#ko au premier round."],
    ignoreDictionary: true,
    detect: regex(r`${B}(?:Mma|mma|ko|Ko|tko|Tko|ufc|Ufc)(?=${E})`, (m) => m[0].toUpperCase(), {
      flags: "gu",
      keepCase: false,
    }),
  }),
  rule({
    ...brand,
    id: "marque-capitales",
    title: "« HEXAGONE MMA » toujours en capitales",
    explanation:
      "Le nom de la ligue s'écrit toujours HEXAGONE MMA, en capitales, sauf dans les hashtags. C'est la règle de marque, la même que celle du linter éditorial.",
    examples: [
      { wrong: "Bienvenue à Hexagone MMA 14 !", right: "Bienvenue à HEXAGONE MMA 14 !" },
      { wrong: "La soirée hexagone mma de samedi.", right: "La soirée HEXAGONE MMA de samedi." },
    ],
    alsoRight: ["HEXAGONE MMA 14.", "#HexagoneMMA"],
    ignoreDictionary: true,
    detect: regex(r`(?<![#@]|${WORD})hexagone[  ]+mma(?!${WORD})`, (m) =>
      m[0] === "HEXAGONE MMA" ? null : "HEXAGONE MMA",
    ),
  }),
  rule({
    ...brand,
    id: "marque-de-hexagone",
    title: "« de HEXAGONE MMA », jamais « d'HEXAGONE MMA »",
    explanation:
      "La règle maison impose « de HEXAGONE MMA » : la soirée de HEXAGONE MMA. Exception : la ceinture d'HEXAGONE MMA, le titre d'HEXAGONE MMA.",
    examples: [
      { wrong: "La soirée d'HEXAGONE MMA.", right: "La soirée de HEXAGONE MMA." },
      {
        wrong: "Les combattants d'HEXAGONE MMA sont prêts.",
        right: "Les combattants de HEXAGONE MMA sont prêts.",
      },
    ],
    alsoRight: ["La ceinture d'HEXAGONE MMA.", "La soirée de HEXAGONE MMA."],
    ignoreDictionary: true,
    detect: regex(
      r`(?<!(?:^|[^\p{L}])(?:ceintures?|titres?)(?:\s+\S+){0,2}\s+)(?<!${WORD})d${AP}(?=HEXAGONE MMA(?!${WORD}))`,
      (m) => (/^D/.test(m[0]) ? "De " : "de "),
    ),
  }),
  rule({
    ...brand,
    id: "marque-ceinture",
    title: "Exception : « la ceinture d'HEXAGONE MMA »",
    explanation:
      "Après « ceinture » ou « titre », l'usage maison garde l'élision : la ceinture d'HEXAGONE MMA. C'est la seule exception à « de HEXAGONE MMA ».",
    examples: [
      {
        wrong: "La ceinture de HEXAGONE MMA est en jeu.",
        right: "La ceinture d'HEXAGONE MMA est en jeu.",
      },
      {
        wrong: "Le titre de HEXAGONE MMA change de mains.",
        right: "Le titre d'HEXAGONE MMA change de mains.",
      },
    ],
    alsoRight: ["La ceinture d'HEXAGONE MMA."],
    ignoreDictionary: true,
    detect: regex(r`(?<=${B}(?:ceintures?|titres?)${S})de${S}(?=HEXAGONE MMA(?!${WORD}))`, "d'"),
  }),
];
