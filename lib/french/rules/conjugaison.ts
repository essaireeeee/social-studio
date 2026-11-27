/** Conjugaison (section 6.3, niveaux 1 et 2). */
import { AP, B, E, S, SENTENCE_START, keepCase } from "../text";
import { fromTable, r, regex, rule } from "./helpers";

const base = { family: "conjugaison", level: 1, severity: "error", confidence: "high" } as const;

const SUBJUNCTIVE: Record<string, string> = {
  est: "soit",
  sont: "soient",
  a: "ait",
  ont: "aient",
  peut: "puisse",
  peuvent: "puissent",
  va: "aille",
  vont: "aillent",
  fait: "fasse",
  font: "fassent",
  sait: "sache",
  veut: "veuille",
  vient: "vienne",
  prend: "prenne",
};
const INDICATIVE_VERBS = Object.keys(SUBJUNCTIVE).join("|");

const subjunctiveAfter = (head: string) =>
  regex(
    r`(?<=${B}(?:${head})${S}qu(?:e${S}|${AP})(?:il|elle|on|ils|elles)${S})(?:${INDICATIVE_VERBS})(?=${E})`,
    fromTable(SUBJUNCTIVE),
  );

/** Mots en -ais qui ne sont pas des verbes conjugués. */
const NOT_VERB_AIS = new Set([
  "mais",
  "jamais",
  "palais",
  "frais",
  "relais",
  "français",
  "anglais",
  "désormais",
  "dais",
  "biais",
  "marais",
  "niais",
  "portugais",
  "polonais",
  "japonais",
  "irlandais",
  "épais",
  "rabais",
  "balais",
  "laquais",
  "écossais",
  "néerlandais",
  "congolais",
  "sénégalais",
  "libanais",
]);

export const CONJUGAISON_RULES = [
  rule({
    ...base,
    id: "conj-a-ete",
    title: "« il a été », jamais « il a était »",
    explanation:
      "Avec l'auxiliaire avoir, le verbe être devient « été » : il a été exceptionnel. « Était » est l'imparfait, il ne suit jamais avoir.",
    examples: [
      { wrong: "Il a était exceptionnel.", right: "Il a été exceptionnel." },
      { wrong: "Ils ont était solides.", right: "Ils ont été solides." },
    ],
    alsoRight: ["Il a été exceptionnel.", "Il était prêt."],
    detect: regex(r`(?<=${B}(?:a|ont|avait|aura|aurait|ai|avons|avez)${S})était(?=${E})`, "été"),
  }),
  rule({
    ...base,
    id: "conj-futur-premiere-personne",
    level: 2,
    severity: "warning",
    confidence: "medium",
    title: "Futur « je serai » ou conditionnel « je serais » ?",
    explanation:
      "Pour une certitude à venir (demain, samedi), c'est le futur : je serai, sans s. Le conditionnel « je serais » exprime une hypothèse.",
    examples: [
      { wrong: "Demain, je serais dans la cage.", right: "Demain, je serai dans la cage." },
      {
        wrong: "Samedi, je combattrais pour le titre.",
        right: "Samedi, je combattrai pour le titre.",
      },
    ],
    alsoRight: ["Si je gagnais, je serais champion.", "Demain, je serai là."],
    detect: regex(r`(?<=${B}(?:je${S}|j${AP}))\p{L}+rais(?=${E})`, (m) => {
      const sentenceStart = Math.max(
        m.input.lastIndexOf(".", m.index),
        m.input.lastIndexOf("!", m.index),
        m.input.lastIndexOf("?", m.index),
        m.input.lastIndexOf("\n", m.index),
      );
      const sentence = m.input.slice(sentenceStart + 1, m.index + 40).toLowerCase();
      if (/\bsi\b/.test(sentence)) return null;
      if (!/(demain|samedi|dimanche|vendredi|ce soir|bientôt|prochain|prochaine)/.test(sentence))
        return null;
      return m[0].slice(0, -1);
    }),
  }),
  rule({
    ...base,
    id: "conj-imperatif-er",
    title: "Impératif des verbes en -er : pas de s",
    explanation:
      "À l'impératif, les verbes en -er ne prennent pas de s : réserve ta place, partage la vidéo. Exception : devant « en » et « y » (penses-y).",
    examples: [
      { wrong: "Réserves ta place dès maintenant.", right: "Réserve ta place dès maintenant." },
      { wrong: "Partages la vidéo !", right: "Partage la vidéo !" },
    ],
    alsoRight: ["Réserve ta place.", "Prends tes places.", "Penses-y."],
    detect: regex(
      r`${SENTENCE_START}(?:Réserves|Partages|Regardes|Restes|Profites|Prépares|Commentes|Abonnes)(?=${S})`,
      (m) => m[0].slice(0, -1),
      { flags: "gmu" },
    ),
  }),
  rule({
    ...base,
    id: "conj-imperatif-re",
    title: "Impératif des verbes en -re et -ir : un s final",
    explanation:
      "À l'impératif, à la deuxième personne, les verbes comme prendre ou venir prennent un s : prends tes places, viens vivre la soirée. Seuls les verbes en -er le perdent.",
    examples: [
      { wrong: "Prend tes places pour samedi.", right: "Prends tes places pour samedi." },
      { wrong: "Vient vivre la soirée avec nous.", right: "Viens vivre la soirée avec nous." },
    ],
    alsoRight: ["Prends tes places.", "Il prend ses places."],
    detect: regex(
      r`${SENTENCE_START}(?:Prend|Vient|Attend|Défend|Tient|Rejoint)(?=${S})`,
      fromTable({
        prend: "prends",
        vient: "viens",
        attend: "attends",
        défend: "défends",
        tient: "tiens",
        rejoint: "rejoins",
      }),
      { flags: "gmu" },
    ),
  }),
  rule({
    ...base,
    id: "conj-subjonctif-bien-que",
    level: 2,
    title: "Subjonctif après « bien que »",
    explanation:
      "« Bien que » exprime une concession et appelle le subjonctif : bien qu'il soit blessé. L'indicatif « il est » ne convient pas.",
    examples: [
      {
        wrong: "Bien qu'il est blessé, il combattra.",
        right: "Bien qu'il soit blessé, il combattra.",
      },
      {
        wrong: "Bien qu'ils ont perdu, ils reviendront.",
        right: "Bien qu'ils aient perdu, ils reviendront.",
      },
    ],
    alsoRight: ["Bien qu'il soit blessé.", "Il est blessé."],
    detect: subjunctiveAfter("bien"),
  }),
  rule({
    ...base,
    id: "conj-subjonctif-avant-que",
    level: 2,
    title: "Subjonctif après « avant que »",
    explanation:
      "« Avant que » introduit une action pas encore réalisée : le subjonctif s'impose, avant qu'il ait le temps. À l'inverse, « après que » prend l'indicatif.",
    examples: [
      {
        wrong: "Avant qu'il a le temps de réagir, c'est fini.",
        right: "Avant qu'il ait le temps de réagir, c'est fini.",
      },
      {
        wrong: "Avant qu'elle peut répondre, il frappe.",
        right: "Avant qu'elle puisse répondre, il frappe.",
      },
    ],
    alsoRight: ["Avant qu'il ait le temps."],
    detect: subjunctiveAfter("avant"),
  }),
  rule({
    ...base,
    id: "conj-subjonctif-pour-que",
    level: 2,
    title: "Subjonctif après « pour que », « afin que »",
    explanation:
      "« Pour que » et « afin que » expriment un but : le verbe se met au subjonctif, pour qu'il puisse combattre. L'indicatif est une faute.",
    examples: [
      {
        wrong: "Pour qu'il peut combattre, il doit faire le poids.",
        right: "Pour qu'il puisse combattre, il doit faire le poids.",
      },
      {
        wrong: "Afin qu'ils vont au bout, le public pousse.",
        right: "Afin qu'ils aillent au bout, le public pousse.",
      },
    ],
    alsoRight: ["Pour qu'il puisse combattre."],
    detect: subjunctiveAfter("pour|afin"),
  }),
  rule({
    ...base,
    id: "conj-apres-que",
    level: 2,
    severity: "warning",
    title: "Indicatif après « après que »",
    explanation:
      "« Après que » présente un fait accompli : la règle demande l'indicatif, après qu'il a gagné. Le subjonctif est très répandu, mais fautif.",
    examples: [
      { wrong: "Après qu'il ait gagné, il a pleuré.", right: "Après qu'il a gagné, il a pleuré." },
      {
        wrong: "Après qu'ils soient entrés, la salle a explosé.",
        right: "Après qu'ils sont entrés, la salle a explosé.",
      },
    ],
    alsoRight: ["Après qu'il a gagné."],
    detect: regex(
      r`(?<=${B}après${S}qu(?:e${S}|${AP})(?:il|elle|on|ils|elles)${S})(?:ait|aient|soit|soient)(?=${E})`,
      fromTable({ ait: "a", aient: "ont", soit: "est", soient: "sont" }),
    ),
  }),
  rule({
    ...base,
    id: "conj-indre",
    level: 2,
    title: "Verbes en -indre : il atteint, il rejoint",
    explanation:
      "Les verbes en -indre perdent le d au présent : il atteint, il rejoint, il craint. Seuls les verbes en -dre comme prendre gardent le d.",
    examples: [
      { wrong: "Il atteind la finale.", right: "Il atteint la finale." },
      { wrong: "Il rejoind le camp de Paris.", right: "Il rejoint le camp de Paris." },
    ],
    alsoRight: ["Il atteint la finale."],
    detect: regex(
      r`${B}(?:atteind|craind|rejoind|peind|éteind|joind|contraind|plaind)(?=${E})`,
      (m) => keepCase(m[0], m[0].toLowerCase().replace(/nd$/, "nt")),
    ),
  }),
  rule({
    ...base,
    id: "conj-prendre",
    level: 2,
    title: "Verbes en -prendre : il prend, il reprend",
    explanation:
      "Prendre et ses composés gardent le d au présent : il prend, il reprend, il comprend. « Il prent » n'existe pas.",
    examples: [
      { wrong: "Il prent son temps.", right: "Il prend son temps." },
      { wrong: "Il reprent le contrôle.", right: "Il reprend le contrôle." },
    ],
    alsoRight: ["Il prend son temps."],
    detect: regex(r`${B}(?:prent|apprent|comprent|surprent|reprent)(?=${E})`, (m) =>
      keepCase(m[0], m[0].toLowerCase().replace(/nt$/, "nd")),
    ),
  }),
  rule({
    ...base,
    id: "conj-faites-dites",
    title: "« vous faites », « vous dites »",
    explanation:
      "Faire et dire sont irréguliers : vous faites, vous dites. « Faisez » et « disez » n'existent pas (contredisez, oui).",
    examples: [
      { wrong: "Vous faisez partie de l'histoire.", right: "Vous faites partie de l'histoire." },
      { wrong: "Qu'en disez-vous ?", right: "Qu'en dites-vous ?" },
    ],
    alsoRight: ["Vous faites partie de l'histoire.", "Vous contredisez le coach."],
    detect: regex(
      r`${B}(?:faisez|disez|redisez|refaisez)(?=${E})`,
      fromTable({ faisez: "faites", disez: "dites", redisez: "redites", refaisez: "refaites" }),
    ),
  }),
  rule({
    ...base,
    id: "conj-je-peux",
    title: "« je peux », « tu peux »",
    explanation:
      "Avec je et tu, le verbe pouvoir s'écrit avec un x : je peux, tu peux. Le t est réservé à il, elle, on.",
    examples: [
      { wrong: "Je peut le battre.", right: "Je peux le battre." },
      { wrong: "Tu peut réserver ta place.", right: "Tu peux réserver ta place." },
    ],
    alsoRight: ["Je peux le battre."],
    detect: regex(r`(?<=${B}(?:je|tu)${S})peut(?=${E})`, "peux"),
  }),
  rule({
    ...base,
    id: "conj-il-peut",
    title: "« il peut », « elle peut »",
    explanation:
      "Avec il, elle ou on, le verbe pouvoir se termine par un t : il peut. Le x est réservé à je et tu.",
    examples: [
      { wrong: "Il peux encore gagner.", right: "Il peut encore gagner." },
      { wrong: "Elle peux le faire.", right: "Elle peut le faire." },
    ],
    alsoRight: ["Il peut gagner."],
    detect: regex(r`(?<=${B}(?:il|elle|on|qui|ça|cela)${S})peux(?=${E})`, "peut"),
  }),
  rule({
    ...base,
    id: "conj-il-ait",
    title: "Imparfait : il -ait, pas il -ais",
    explanation:
      "À l'imparfait, avec il, elle ou on, la terminaison est -ait : il savait, elle frappait. La terminaison -ais va avec je et tu.",
    examples: [
      { wrong: "Il savais qu'il allait gagner.", right: "Il savait qu'il allait gagner." },
      { wrong: "Elle frappais fort.", right: "Elle frappait fort." },
    ],
    alsoRight: ["Il savait.", "Il est français."],
    detect: regex(r`(?<=${B}(?:il|elle|on|qui)${S})\p{L}{2,}ais(?=${E})`, (m) =>
      NOT_VERB_AIS.has(m[0].toLowerCase()) ? null : `${m[0].slice(0, -1)}t`,
    ),
  }),
  rule({
    ...base,
    id: "conj-je-ais",
    title: "Imparfait : je -ais, pas je -ait",
    explanation:
      "À l'imparfait, avec je, la terminaison est -ais : je savais, j'avais. La terminaison -ait va avec il, elle, on.",
    examples: [
      { wrong: "Je savait que ce serait dur.", right: "Je savais que ce serait dur." },
      { wrong: "J'avait tout donné.", right: "J'avais tout donné." },
    ],
    alsoRight: ["Je savais."],
    detect: regex(
      r`(?<=${B}(?:je${S}|j${AP}))\p{L}{2,}ait(?=${E})`,
      (m) => `${m[0].slice(0, -1)}s`,
    ),
  }),
  rule({
    ...base,
    id: "conj-infinitif-ez",
    title: "Infinitif après pour, sans, afin de : -er, pas -ez",
    explanation:
      "Après une préposition, le verbe est à l'infinitif : pour réserver, sans hésiter. La terminaison -ez est celle de « vous ».",
    examples: [
      { wrong: "Cliquez pour réservez.", right: "Cliquez pour réserver." },
      { wrong: "Sans hésitez, il a foncé.", right: "Sans hésiter, il a foncé." },
    ],
    alsoRight: ["Réservez vos places.", "Pour réserver."],
    detect: regex(r`(?<=${B}(?:pour|sans|afin de|à)${S})\p{L}{2,}ez(?=${E})`, (m) =>
      /^(chez|nez|rez|assez)$/i.test(m[0]) ? null : `${m[0].slice(0, -2)}er`,
    ),
  }),
];
