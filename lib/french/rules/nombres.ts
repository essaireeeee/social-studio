/** Pluriels et nombres (section 6.3, niveaux 1 et 2). */
import { B, E, S } from "../text";
import { fromTable, r, regex, rule } from "./helpers";

const plural = { family: "pluriels", level: 1, severity: "error", confidence: "high" } as const;
const number = { family: "nombres", level: 1, severity: "error", confidence: "high" } as const;

const UNITS =
  "un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize";
const DIGITS_2_9 = "deux|trois|quatre|cinq|six|sept|huit|neuf";
const LETTERS: Record<string, string> = {
  "2": "deux",
  "3": "trois",
  "4": "quatre",
  "5": "cinq",
  "6": "six",
  "7": "sept",
  "8": "huit",
  "9": "neuf",
};
const AL_AUX: Record<string, string> = {
  journals: "journaux",
  chevals: "chevaux",
  régionals: "régionaux",
  nationals: "nationaux",
  internationals: "internationaux",
  mondials: "mondiaux",
  principals: "principaux",
  spécials: "spéciaux",
  amicals: "amicaux",
  originals: "originaux",
  normals: "normaux",
  globals: "globaux",
  locals: "locaux",
  générals: "généraux",
  légals: "légaux",
  égals: "égaux",
  brutals: "brutaux",
  loyals: "loyaux",
  médicals: "médicaux",
  tropicals: "tropicaux",
};

export const NOMBRE_RULES = [
  rule({
    ...plural,
    id: "pl-al-aux",
    title: "Pluriel en -aux des mots en -al",
    explanation:
      "La plupart des mots en -al font leur pluriel en -aux : des combats régionaux, des titres mondiaux. Quelques exceptions gardent -als (festivals, récitals).",
    examples: [
      {
        wrong: "Deux combats régionals ce week-end.",
        right: "Deux combats régionaux ce week-end.",
      },
      { wrong: "Les titres mondials sont en jeu.", right: "Les titres mondiaux sont en jeu." },
    ],
    alsoRight: ["Les festivals d'été.", "Des combats régionaux."],
    detect: regex(r`${B}(?:${Object.keys(AL_AUX).join("|")})(?=${E})`, fromTable(AL_AUX)),
  }),
  rule({
    ...plural,
    id: "pl-ail-aux",
    title: "Pluriel des mots en -ail : travaux, mais détails",
    explanation:
      "Quelques mots en -ail font -aux (des travaux) ; la plupart prennent un s (des détails). « Travails » et « détaux » sont fautifs.",
    examples: [
      {
        wrong: "Les travails de la salle sont finis.",
        right: "Les travaux de la salle sont finis.",
      },
      { wrong: "Tous les détaux du gala.", right: "Tous les détails du gala." },
    ],
    alsoRight: ["Les travaux avancent."],
    detect: regex(
      r`${B}(?:travails|vitrails|détaux)(?=${E})`,
      fromTable({ travails: "travaux", vitrails: "vitraux", détaux: "détails" }),
    ),
  }),
  rule({
    ...plural,
    id: "pl-week-ends",
    title: "« des week-ends »",
    explanation:
      "Le nom composé week-end prend un s au pluriel, sur le second élément : des week-ends. Le trait d'union reste.",
    examples: [
      { wrong: "Trois week-end de suite.", right: "Trois week-ends de suite." },
      { wrong: "Tous les week-end, il s'entraîne.", right: "Tous les week-ends, il s'entraîne." },
    ],
    alsoRight: ["Ce week-end.", "Les week-ends."],
    detect: regex(
      r`(?<=${B}(?:les|des|ces|deux|trois|quatre|plusieurs|nos|vos)${S})week-end(?=${E})`,
      "week-ends",
    ),
  }),
  rule({
    ...plural,
    id: "pl-face-a-face",
    title: "« des face-à-face » (invariable)",
    explanation: "Face-à-face est invariable : des face-à-face. On n'ajoute pas de s.",
    examples: [
      { wrong: "Les face-à-faces ont été tendus.", right: "Les face-à-face ont été tendus." },
      { wrong: "Deux face-à-faces en une semaine.", right: "Deux face-à-face en une semaine." },
    ],
    alsoRight: ["Les face-à-face."],
    detect: regex(r`${B}face-à-faces(?=${E})`, "face-à-face"),
  }),
  rule({
    ...plural,
    id: "pl-sigles",
    severity: "warning",
    title: "Sigles invariables : des KO, des TKO",
    explanation:
      "En français, les sigles ne prennent pas la marque du pluriel : cinq KO en carrière. Le s ou l'apostrophe à l'anglaise sont à retirer.",
    examples: [
      { wrong: "Il compte cinq KOs en carrière.", right: "Il compte cinq KO en carrière." },
      { wrong: "Trois TKOs cette saison.", right: "Trois TKO cette saison." },
    ],
    alsoRight: ["Cinq KO en carrière."],
    ignoreDictionary: true,
    detect: regex(r`${B}(?:KO|TKO)(?:'s|’s|s)(?=${E})`, (m) => m[0].replace(/(?:'s|’s|s)$/, ""), {
      flags: "gu",
    }),
  }),
  rule({
    ...plural,
    id: "pl-contre-attaques",
    title: "« des contre-attaques »",
    explanation:
      "Dans contre-attaque, seul le nom prend la marque du pluriel : des contre-attaques. « Contre » reste invariable.",
    examples: [
      { wrong: "Ses contre-attaque ont fait mal.", right: "Ses contre-attaques ont fait mal." },
      { wrong: "Deux contre-attaque parfaites.", right: "Deux contre-attaques parfaites." },
    ],
    alsoRight: ["Une contre-attaque."],
    detect: regex(
      r`(?<=${B}(?:les|des|ces|ses|deux|trois|quatre|plusieurs)${S})contre-attaque(?=${E})`,
      "contre-attaques",
    ),
  }),
  rule({
    ...number,
    id: "nb-quatre-vingts",
    title: "« quatre-vingts » prend un s quand il termine le nombre",
    explanation:
      "Vingt et cent multipliés prennent un s s'ils terminent le nombre : quatre-vingts kilos. Suivis d'un autre nombre, ils restent invariables : quatre-vingt-deux.",
    examples: [
      { wrong: "Il pèse quatre-vingt kilos.", right: "Il pèse quatre-vingts kilos." },
      { wrong: "Plus de quatre-vingt fans.", right: "Plus de quatre-vingts fans." },
    ],
    alsoRight: ["Quatre-vingt-deux kilos.", "Quatre-vingts kilos.", "Quatre-vingt mille fans."],
    detect: regex(
      r`${B}quatre[- ]vingt(?=${E})(?!-|${S}(?:et|${UNITS}|mille|millions?)${E})`,
      "quatre-vingts",
    ),
  }),
  rule({
    ...number,
    id: "nb-quatre-vingt-suivi",
    title: "« quatre-vingt » sans s devant un autre nombre",
    explanation:
      "Suivi d'un autre nombre, vingt reste invariable : quatre-vingt-deux, quatre-vingt-cinq. Le s n'apparaît qu'en fin de nombre.",
    examples: [
      { wrong: "Quatre-vingts-deux kilos.", right: "Quatre-vingt-deux kilos." },
      { wrong: "Il a mis quatre-vingts-cinq coups.", right: "Il a mis quatre-vingt-cinq coups." },
    ],
    alsoRight: ["Quatre-vingt-deux."],
    detect: regex(r`${B}quatre-vingts(?=-|${S}(?:${UNITS}|mille)${E})`, "quatre-vingt"),
  }),
  rule({
    ...number,
    id: "nb-cents",
    title: "« deux cents » prend un s quand il termine le nombre",
    explanation:
      "Cent multiplié prend un s s'il termine le nombre : deux cents fans. Suivi d'un autre nombre, il reste invariable : deux cent cinq.",
    examples: [
      {
        wrong: "Deux cent fans ont fait le déplacement.",
        right: "Deux cents fans ont fait le déplacement.",
      },
      { wrong: "Trois cent places restantes.", right: "Trois cents places restantes." },
    ],
    alsoRight: ["Deux cent cinq fans.", "Deux cents fans.", "Deux cent mille vues."],
    detect: regex(
      r`(?<=${B}(?:${DIGITS_2_9})[ -])cent(?=${E})(?!-|${S}(?:${UNITS}|vingt|trente|quarante|cinquante|soixante|mille|et)${E})`,
      "cents",
    ),
  }),
  rule({
    ...number,
    id: "nb-cent-suivi",
    title: "« deux cent » sans s devant un autre nombre",
    explanation:
      "Suivi d'un autre nombre, cent reste invariable : deux cent cinq places. Le s ne s'écrit qu'en fin de nombre.",
    examples: [
      { wrong: "Deux cents cinq places.", right: "Deux cent cinq places." },
      { wrong: "Trois cents vingt fans.", right: "Trois cent vingt fans." },
    ],
    alsoRight: ["Deux cents places."],
    detect: regex(
      r`(?<=${B}(?:${DIGITS_2_9})[ -])cents(?=${S}(?:${UNITS}|vingt|trente|quarante|cinquante|soixante|mille)${E})`,
      "cent",
    ),
  }),
  rule({
    ...number,
    id: "nb-mille",
    title: "« mille » est invariable",
    explanation:
      "Le nombre mille ne prend jamais de s : deux mille fans. « Milles » désigne une unité de distance.",
    examples: [
      { wrong: "Deux milles fans à Paris.", right: "Deux mille fans à Paris." },
      { wrong: "Plus de dix milles spectateurs.", right: "Plus de dix mille spectateurs." },
    ],
    alsoRight: ["Deux mille fans."],
    detect: regex(
      r`(?<=${B}(?:${DIGITS_2_9}|dix|cent|cents|vingt|\d+)${S})milles(?=${E})`,
      "mille",
    ),
  }),
  rule({
    ...number,
    id: "nb-traits-union",
    title: "Trait d'union dans les nombres composés",
    explanation:
      "Les nombres composés inférieurs à cent s'écrivent avec un trait d'union : vingt-deux, dix-sept. Seul « et » le remplace (vingt et un).",
    examples: [
      { wrong: "Il a vingt deux ans.", right: "Il a vingt-deux ans." },
      { wrong: "Dix sept victoires en carrière.", right: "Dix-sept victoires en carrière." },
    ],
    alsoRight: ["Vingt-deux ans.", "Vingt et un ans."],
    detect: regex(
      r`${B}(vingt|trente|quarante|cinquante|soixante|dix)${S}(deux|trois|quatre|cinq|six|sept|huit|neuf)(?=${E})`,
      (m) => {
        if (m[1]!.toLowerCase() === "dix" && !/^(sept|huit|neuf)$/i.test(m[2]!)) return null;
        return `${m[1]}-${m[2]}`;
      },
    ),
  }),
  rule({
    ...number,
    id: "nb-ordinal-e",
    title: "Ordinaux abrégés : 2e, 3e (jamais 2ème)",
    explanation:
      "L'abréviation de deuxième, troisième s'écrit avec un e en exposant ou à la suite : 2e, 3e. « 2ème » et « 2è » sont fautifs.",
    examples: [
      { wrong: "Il frappe au 2ème round.", right: "Il frappe au 2e round." },
      { wrong: "Sa 3ème victoire de suite.", right: "Sa 3e victoire de suite." },
    ],
    alsoRight: ["Au 2e round.", "Le 1er round."],
    detect: regex(r`(?<=\d)(?:ème|éme|ième|iéme|è)(?=${E})`, "e", { keepCase: false }),
  }),
  rule({
    ...number,
    id: "nb-ordinal-re",
    title: "« 1re » et non « 1ère »",
    explanation:
      "Première s'abrège en 1re, comme premier en 1er. « 1ère » mélange les deux formes.",
    examples: [
      { wrong: "Sa 1ère défense de titre.", right: "Sa 1re défense de titre." },
      { wrong: "La 1ere édition.", right: "La 1re édition." },
    ],
    alsoRight: ["Sa 1re défense."],
    detect: regex(r`(?<=\d)(?:ère|ere|ière)(?=${E})`, "re", { keepCase: false }),
  }),
  rule({
    ...number,
    id: "nb-ordinal-nd",
    title: "« 2e » et non « 2nd »",
    explanation:
      "Le français abrège second et deuxième en 2e. « 2nd » est une abréviation anglaise.",
    examples: [
      { wrong: "Le 2nd round a été serré.", right: "Le 2e round a été serré." },
      { wrong: "Sa 2nde victoire.", right: "Sa 2e victoire." },
    ],
    alsoRight: ["Le 2e round."],
    detect: regex(r`(?<=\d)(?:nd|nde|nds|ndes)(?=${E})`, "e", { keepCase: false }),
  }),
  rule({
    ...number,
    id: "nb-round-abrege",
    severity: "suggestion",
    title: "« R1 » réservé au LIVE : « 1er round » ailleurs",
    explanation:
      "L'abréviation R1, R2 est tolérée dans les textes LIVE, écrits dans l'urgence. Ailleurs, on écrit 1er round, 2e round.",
    examples: [
      { wrong: "Il a terminé le combat au R1.", right: "Il a terminé le combat au 1er round." },
      { wrong: "Gros KO au R3 cette nuit.", right: "Gros KO au 3e round cette nuit." },
    ],
    alsoRight: ["Au 1er round."],
    ignoreDictionary: true,
    detect: regex(
      r`${B}R([1-5])(?=${E})`,
      (m, ctx) => (ctx.mode === "live" ? null : m[1] === "1" ? "1er round" : `${m[1]}e round`),
      { flags: "gu" },
    ),
  }),
  rule({
    ...number,
    id: "nb-lettres",
    severity: "suggestion",
    title: "Petits nombres en lettres (règle maison)",
    explanation:
      "Si la règle maison le demande, les nombres de deux à neuf s'écrivent en lettres devant un nom : trois rounds. Par défaut, les chiffres sont acceptés.",
    examples: [
      { wrong: "Il a gagné en 3 rounds.", right: "Il a gagné en trois rounds." },
      { wrong: "Il compte 5 victoires de suite.", right: "Il compte cinq victoires de suite." },
    ],
    alsoRight: ["Il a gagné en trois rounds."],
    testPrefs: { numbers: "letters" },
    detect: regex(
      r`${B}([2-9])(?=${S}(?:rounds|combats|victoires|défaites|kilos|semaines|jours|ans|fois)${E})`,
      (m, ctx) => (ctx.prefs.numbers === "letters" ? LETTERS[m[1]!]! : null),
    ),
  }),
];
