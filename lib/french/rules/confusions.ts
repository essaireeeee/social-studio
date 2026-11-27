/** Confusions lexicales (section 6.3, niveaux 2 et 3). */
import { AP, B, E, S, keepCase } from "../text";
import { fromTable, INFINITIVE, r, regex, rule } from "./helpers";

const base = { family: "confusions", level: 2, severity: "error", confidence: "high" } as const;

export const CONFUSION_RULES = [
  rule({
    ...base,
    id: "conf-pret-a",
    title: "« prêt à » (disposé à), pas « près à »",
    explanation:
      "« Prêt à » signifie disposé à : il est prêt à combattre. « Près de » indique la proximité : près de la victoire.",
    examples: [
      { wrong: "Il est près à combattre.", right: "Il est prêt à combattre." },
      { wrong: "Karim est près pour la revanche.", right: "Karim est prêt pour la revanche." },
    ],
    alsoRight: ["Il est près de la victoire.", "Il est prêt à combattre."],
    detect: regex(r`${B}près(?=${S}(?:à|pour)${E})`, (m) => {
      const before = m.input.slice(Math.max(0, m.index - 20), m.index).toLowerCase();
      return keepCase(m[0], /\belle\b/.test(before) ? "prête" : "prêt");
    }),
  }),
  rule({
    ...base,
    id: "conf-pres-de",
    severity: "warning",
    confidence: "medium",
    title: "« près de » (proche de), pas « prêt de »",
    explanation:
      "Pour dire qu'on est proche d'un résultat, on écrit « près de » : près de la victoire. « Prêt » se construit avec « à ».",
    examples: [
      { wrong: "Il était prêt de la victoire.", right: "Il était près de la victoire." },
      { wrong: "Il est passé prêt de la défaite.", right: "Il est passé près de la défaite." },
    ],
    alsoRight: ["Il est prêt à gagner.", "Un prêt de matériel."],
    detect: regex(
      r`${B}prêt(?=${S}de${S}(?:la|le|l${AP})${S}?(?:victoire|défaite|KO|but|record|titre|chute|ceinture|exploit))`,
      "près",
    ),
  }),
  rule({
    ...base,
    id: "conf-davantage",
    title: "« davantage » (plus), en un mot",
    explanation:
      "Au sens de « plus », « davantage » s'écrit en un mot : il en veut encore davantage. « D'avantage » signifie « d'atout » (pas d'avantage de taille).",
    examples: [
      { wrong: "Il en veut encore d'avantage.", right: "Il en veut encore davantage." },
      { wrong: "Il frappe d'avantage que son rival.", right: "Il frappe davantage que son rival." },
    ],
    alsoRight: ["Il n'a pas d'avantage de taille.", "Il frappe davantage."],
    detect: regex(
      r`(?<=${B}(?:encore|bien|toujours|beaucoup)${S})d${AP}avantage(?=${E})|${B}d${AP}avantage(?=${S}qu(?:e${E}|${AP}))`,
      "davantage",
    ),
  }),
  rule({
    ...base,
    id: "conf-voire",
    title: "« voire » (et même), pas « voir »",
    explanation:
      "« Voire » signifie « et même » : un combat serré, voire plus. « Voir » est le verbe.",
    examples: [
      { wrong: "Un combat serré, voir plus.", right: "Un combat serré, voire plus." },
      {
        wrong: "Une victoire nette, voir même écrasante.",
        right: "Une victoire nette, voire même écrasante.",
      },
    ],
    alsoRight: ["À voir plus tard.", "Il faut voir même si ça fait mal."],
    detect: regex(r`(?<=,${S})voir(?=${S}(?:même|plus|mieux|pire|davantage)${E})`, "voire"),
  }),
  rule({
    ...base,
    id: "conf-plus-tot",
    title: "« plus tôt » (temps) ou « plutôt » (préférence)",
    explanation:
      "« Plus tôt » s'oppose à « plus tard » : plus tôt que prévu. « Plutôt » marque une préférence : plutôt que de reculer.",
    examples: [
      {
        wrong: "Le combat a commencé plutôt que prévu.",
        right: "Le combat a commencé plus tôt que prévu.",
      },
      { wrong: "Plus tôt que de reculer, il avance.", right: "Plutôt que de reculer, il avance." },
    ],
    alsoRight: ["Il arrive plus tôt que prévu.", "Plutôt que de reculer."],
    detect: regex(
      r`${B}plutôt(?=${S}que${S}prévu${E})|${B}plus${S}tôt(?=${S}que${S}(?:de|d${AP}))`,
      (m) => keepCase(m[0], m[0].toLowerCase() === "plutôt" ? "plus tôt" : "plutôt"),
    ),
  }),
  rule({
    ...base,
    id: "conf-cense",
    title: "« censé » (supposé) devant un infinitif",
    explanation:
      "« Censé » signifie supposé : il était censé gagner. « Sensé » signifie raisonnable (un choix sensé).",
    examples: [
      { wrong: "Il était sensé gagner facilement.", right: "Il était censé gagner facilement." },
      {
        wrong: "Elle est sensée défendre son titre.",
        right: "Elle est censée défendre son titre.",
      },
    ],
    alsoRight: ["Un choix sensé.", "Il est censé gagner."],
    detect: regex(r`${B}sensé(?:e|s|es)?(?=${S}(?:${INFINITIVE}|être|avoir|faire)${E})`, (m) =>
      keepCase(m[0], `c${m[0].slice(1).toLowerCase()}`),
    ),
  }),
  rule({
    ...base,
    id: "conf-quoi-quil",
    title: "« quoi qu'il arrive » en deux mots",
    explanation:
      "« Quoi que » en deux mots signifie « quelle que soit la chose » : quoi qu'il arrive. « Quoique » en un mot signifie « bien que ».",
    examples: [
      { wrong: "Quoiqu'il arrive, il sera prêt.", right: "Quoi qu'il arrive, il sera prêt." },
      { wrong: "Il ira au bout, quoiqu'il arrive.", right: "Il ira au bout, quoi qu'il arrive." },
    ],
    alsoRight: ["Quoiqu'il soit blessé, il combat.", "Quoi qu'il arrive."],
    detect: regex(r`${B}quoiqu(${AP})il(?=${S}arrive${E})`, (m) =>
      keepCase(m[0], `quoi qu${m[1]}il`),
    ),
  }),
  rule({
    ...base,
    id: "conf-parce-que",
    title: "« parce que » (cause) en deux mots soudés",
    explanation:
      "Pour donner une cause, on écrit « parce que » : il a gagné parce qu'il était prêt. « Par ce que » signifie « par la chose que ».",
    examples: [
      { wrong: "Il a gagné par ce qu'il était prêt.", right: "Il a gagné parce qu'il était prêt." },
      { wrong: "Il recule par ce qu'on le presse.", right: "Il recule parce qu'on le presse." },
    ],
    alsoRight: [
      "Il a gagné parce qu'il était prêt.",
      "Il a été surpris par ce que le coach a dit.",
    ],
    detect: regex(
      r`${B}par${S}ce${S}qu(?:e(?=${S}(?:il|elle|on|ils|elles|je|tu|nous|vous)${E})|${AP}(?=(?:il|elle|on|ils|elles)${E}))`,
      (m) => keepCase(m[0], /e$/i.test(m[0]) ? "parce que" : `parce qu${m[0].slice(-1)}`),
    ),
  }),
  rule({
    ...base,
    id: "conf-tache",
    title: "« tâche » (travail) avec accent",
    explanation:
      "Le travail à accomplir s'écrit « tâche », avec un accent circonflexe : une lourde tâche. « Tache » sans accent est une salissure.",
    examples: [
      { wrong: "Une lourde tache l'attend samedi.", right: "Une lourde tâche l'attend samedi." },
      { wrong: "Il s'est mis à la tache dès lundi.", right: "Il s'est mis à la tâche dès lundi." },
    ],
    alsoRight: ["Une tache de sang sur le short.", "Une lourde tâche."],
    detect: regex(
      r`(?<=${B}(?:lourde|rude|difficile|ardue|immense|première|ultime|principale|grande|à la)${S})tache(?=${E})`,
      "tâche",
    ),
  }),
  rule({
    ...base,
    id: "conf-notamment",
    level: 1,
    title: "« notamment » avec deux m",
    explanation:
      "Notamment s'écrit avec deux m et un a : notamment. Les formes « notament » ou « notemment » sont fautives.",
    examples: [
      {
        wrong: "Il maîtrise la lutte, notament au sol.",
        right: "Il maîtrise la lutte, notamment au sol.",
      },
      {
        wrong: "Plusieurs combattants, notemment Karim.",
        right: "Plusieurs combattants, notamment Karim.",
      },
    ],
    alsoRight: ["Notamment au sol."],
    detect: regex(r`${B}(?:notament|notemment|notement|notammant)(?=${E})`, "notamment"),
  }),
  rule({
    ...base,
    id: "conf-pallier",
    level: 3,
    title: "« pallier quelque chose », sans « à »",
    explanation:
      "Pallier est transitif direct : on pallie un manque. « Pallier à » est une faute courante.",
    examples: [
      {
        wrong: "Il doit pallier à ce manque de cardio.",
        right: "Il doit pallier ce manque de cardio.",
      },
      {
        wrong: "Pour pallier au retard, il accélère.",
        right: "Pour pallier le retard, il accélère.",
      },
    ],
    alsoRight: ["Il doit pallier ce manque."],
    detect: regex(
      r`(?<=${B}(?:pallier|pallie|pallient|palliera|pallié|palliait)${S})(?:à|au|aux)${S}`,
      (m) => ({ à: "", au: "le ", aux: "les " })[m[0].trim().toLowerCase() as "à" | "au" | "aux"],
    ),
  }),
  rule({
    ...base,
    id: "conf-se-rappeler",
    level: 3,
    severity: "warning",
    confidence: "medium",
    title: "« se rappeler quelque chose », sans « de »",
    explanation:
      "Se rappeler est transitif direct : il se rappelle le combat. C'est « se souvenir » qui se construit avec « de ».",
    examples: [
      { wrong: "Il se rappelle du combat de 2024.", right: "Il se rappelle le combat de 2024." },
      { wrong: "Je me rappelle des cris du public.", right: "Je me rappelle les cris du public." },
    ],
    alsoRight: ["Il se souvient du combat.", "Il se rappelle le combat."],
    detect: regex(
      r`(?<=${B}(?:se|me|te|nous|vous)${S}(?:rappeler|rappelle|rappellent|rappelait|rappelons|rappelez|rappellera)${S})(?:du|des)(?=${E})`,
      fromTable({ du: "le", des: "les" }),
    ),
  }),
  rule({
    ...base,
    id: "conf-tout-de-suite",
    level: 3,
    severity: "warning",
    confidence: "medium",
    title: "« tout de suite » (immédiatement)",
    explanation:
      "Pour dire immédiatement, on écrit « tout de suite ». « De suite » signifie « à la suite » : trois victoires de suite.",
    examples: [
      { wrong: "Réservez de suite vos places.", right: "Réservez tout de suite vos places." },
      {
        wrong: "Il revient de suite dans la cage.",
        right: "Il revient tout de suite dans la cage.",
      },
    ],
    alsoRight: ["Trois victoires de suite.", "Réservez tout de suite."],
    detect: regex(
      r`(?<=${B}(?:arrive|reviens|revient|commence|répond|réserve|réservez|rejoins|rejoignez|lance|lancez|partage|partagez|venez|viens|appelle)${S})de${S}suite(?=${E})`,
      "tout de suite",
    ),
  }),
  rule({
    ...base,
    id: "conf-malgre-que",
    level: 3,
    severity: "warning",
    title: "« bien que » plutôt que « malgré que »",
    explanation:
      "« Malgré que » est critiqué par l'usage soigné : on écrit « bien que » ou « malgré » suivi d'un nom. Malgré sa blessure, il combat.",
    examples: [
      {
        wrong: "Malgré qu'il soit blessé, il combat.",
        right: "Bien qu'il soit blessé, il combat.",
      },
      {
        wrong: "Il avance malgré que le public siffle.",
        right: "Il avance bien que le public siffle.",
      },
    ],
    alsoRight: ["Malgré sa blessure, il combat."],
    detect: regex(r`${B}malgré${S}qu(?:e${E}|${AP})`, (m) =>
      keepCase(m[0], /e$/i.test(m[0]) ? "bien que" : `bien qu${m[0].slice(-1)}`),
    ),
  }),
  rule({
    ...base,
    id: "conf-au-niveau-de",
    level: 3,
    severity: "suggestion",
    confidence: "medium",
    title: "« au niveau de » : à réserver à une hauteur",
    explanation:
      "« Au niveau de » désigne une hauteur ou un rang : un coup au niveau du foie. Pour un domaine, préférez « côté », « en » ou « en matière de ».",
    examples: [
      { wrong: "Au niveau du cardio, il est prêt.", right: "Côté cardio, il est prêt." },
      { wrong: "Il a progressé au niveau de la lutte.", right: "Il a progressé en lutte." },
    ],
    alsoRight: ["Il frappe au niveau du foie."],
    exactFix: false,
    detect: regex(
      r`${B}au${S}niveau${S}(?:de|du|des|d${AP})(?!${S}?(?:la${S}|l${AP})?(?:foie|tête|visage|menton|ceinture|corps|sol|genou|jambe|côtes|cage)${E})`,
    ),
  }),
  rule({
    ...base,
    id: "conf-digne-de-ce-nom",
    title: "« digne de ce nom »",
    explanation:
      "L'expression figée est « digne de ce nom » : un main event digne de ce nom. « Digne de son nom » est une confusion.",
    examples: [
      { wrong: "Un main event digne de son nom.", right: "Un main event digne de ce nom." },
      { wrong: "Une soirée digne de son nom, enfin.", right: "Une soirée digne de ce nom, enfin." },
    ],
    alsoRight: ["Un combat digne de ce nom."],
    detect: regex(r`(?<=${B}digne${S}de${S})son(?=${S}nom${E})`, "ce"),
  }),
  rule({
    ...base,
    id: "conf-du",
    title: "« dû » (devoir) devant un infinitif",
    explanation:
      "Le participe de devoir prend un accent au masculin singulier : il a dû reculer. « Du » sans accent est un article (du cardio).",
    examples: [
      { wrong: "Il a du s'incliner aux points.", right: "Il a dû s'incliner aux points." },
      { wrong: "Ils ont du reculer.", right: "Ils ont dû reculer." },
    ],
    alsoRight: ["Il a du cardio.", "Il a dû reculer."],
    detect: regex(
      r`(?<=${B}(?:a|ont|avait|aurait|aura|ai|avons|avez|auraient)${S})du(?=${S}(?:[smtl]${AP})?${INFINITIVE}${E})`,
      "dû",
    ),
  }),
  rule({
    ...base,
    id: "conf-dus",
    title: "« dus », « due » sans accent",
    explanation:
      "Seul le masculin singulier « dû » prend un accent. Au féminin et au pluriel : due, dus, dues.",
    examples: [
      { wrong: "Les honneurs dûs au champion.", right: "Les honneurs dus au champion." },
      { wrong: "La victoire est dûe à son cardio.", right: "La victoire est due à son cardio." },
    ],
    alsoRight: ["La victoire est due à son cardio."],
    detect: regex(
      r`${B}(?:dûs|dûes|dûe)(?=${E})`,
      fromTable({ dûs: "dus", dûes: "dues", dûe: "due" }),
    ),
  }),
  rule({
    ...base,
    id: "conf-championne",
    level: 1,
    title: "« la championne », « une combattante »",
    explanation:
      "Au féminin, le nom suit le déterminant : la championne, une combattante. « La champion » mélange deux genres.",
    examples: [
      {
        wrong: "Elle est devenue la champion des poids pailles.",
        right: "Elle est devenue la championne des poids pailles.",
      },
      { wrong: "Une combattant redoutable.", right: "Une combattante redoutable." },
    ],
    alsoRight: ["La championne.", "Une adversaire coriace."],
    detect: regex(
      r`(?<=${B}(?:une|la|cette)${S})(?:champion|combattant|boxeur|lutteur|prétendant)(?=${E})`,
      fromTable({
        champion: "championne",
        combattant: "combattante",
        boxeur: "boxeuse",
        lutteur: "lutteuse",
        prétendant: "prétendante",
      }),
    ),
  }),
  rule({
    ...base,
    id: "conf-la-championne",
    level: 1,
    title: "Déterminant féminin devant « championne », « combattante »",
    explanation:
      "Un nom féminin appelle un déterminant féminin : la championne, une combattante. « Le championne » est un accord manqué.",
    examples: [
      { wrong: "Le championne a défendu son titre.", right: "La championne a défendu son titre." },
      { wrong: "Un combattante redoutable.", right: "Une combattante redoutable." },
    ],
    alsoRight: ["La championne."],
    detect: regex(
      r`${B}(?:le|un|ce)(?=${S}(?:championne|combattante|boxeuse|lutteuse)${E})`,
      fromTable({ le: "la", un: "une", ce: "cette" }),
    ),
  }),
  rule({
    ...base,
    id: "conf-plus-pire",
    level: 1,
    title: "« pire », jamais « plus pire »",
    explanation:
      "Pire est déjà un comparatif (plus mauvais) : on écrit « encore pire », « le pire ». « Plus pire » est un pléonasme fautif.",
    examples: [
      { wrong: "Ce serait encore plus pire.", right: "Ce serait encore pire." },
      { wrong: "Le plus pire scénario.", right: "Le pire scénario." },
    ],
    alsoRight: ["Encore pire."],
    detect: regex(r`${B}plus${S}(?=pire${E})`, ""),
  }),
];
