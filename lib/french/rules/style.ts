/** Pléonasmes et syntaxe (section 6.3, suggestions). */
import { isStopword } from "@/lib/editorial/stopwords-fr";
import { normalizeText } from "@/lib/editorial/text-utils";
import { AP, B, E, S, keepCase, wordsWithPositions } from "../text";
import type { FrenchMatch } from "../types";
import { r, regex, rule } from "./helpers";

const pleo = {
  family: "pleonasmes",
  level: 2,
  severity: "suggestion",
  confidence: "high",
} as const;
const syntax = { family: "syntaxe", level: 2, severity: "suggestion", confidence: "high" } as const;

/** Pléonasme : l'expression entière est remplacée par le mot qui suffit. */
function pleonasm(
  id: string,
  title: string,
  pattern: string,
  replace: string | ((m: RegExpExecArray) => string),
  examples: { wrong: string; right: string }[],
  why: string,
) {
  return rule({
    ...pleo,
    id,
    title,
    explanation: `${why} La répétition alourdit la phrase sans rien ajouter.`,
    examples,
    detect: regex(
      pattern,
      typeof replace === "string" ? replace : (m) => keepCase(m[0], replace(m)),
    ),
  });
}

const HINTED_ANGLICISMS: Record<string, string> = {
  "fight week": "semaine du combat",
  "weigh-in": "pesée",
  "weigh-ins": "pesées",
  "line-up": "plateau",
  staredown: "face-à-face",
  "trash talk": "provocations",
  fighter: "combattant",
  fighters: "combattants",
  teaser: "bande-annonce",
  news: "actualités",
};

export const STYLE_RULES = [
  pleonasm(
    "pleo-monter-en-haut",
    "Pléonasme : « monter en haut »",
    r`${B}(mont\p{L}*)${S}en${S}haut(?=${E})`,
    (m) => m[1]!,
    [
      { wrong: "Il veut monter en haut.", right: "Il veut monter." },
      {
        wrong: "Les fans montent en haut, prêts à crier.",
        right: "Les fans montent, prêts à crier.",
      },
    ],
    "Monter, c'est déjà aller vers le haut.",
  ),
  pleonasm(
    "pleo-aujourdhui",
    "Pléonasme : « au jour d'aujourd'hui »",
    r`${B}au${S}jour${S}d${AP}aujourd${AP}hui(?=${E})`,
    "aujourd'hui",
    [
      { wrong: "Au jour d'aujourd'hui, il est prêt.", right: "Aujourd'hui, il est prêt." },
      { wrong: "Il est au top au jour d'aujourd'hui.", right: "Il est au top aujourd'hui." },
    ],
    "Aujourd'hui contient déjà « jour » (hui signifie ce jour).",
  ),
  pleonasm(
    "pleo-prevoir-avance",
    "Pléonasme : « prévoir à l'avance »",
    r`${B}(prév\p{L}*)${S}(?:à${S}l${AP}avance|d${AP}avance)(?=${E})`,
    (m) => m[1]!,
    [
      { wrong: "Il faut prévoir à l'avance.", right: "Il faut prévoir." },
      { wrong: "Les places prévues d'avance.", right: "Les places prévues." },
    ],
    "Prévoir, c'est déjà voir à l'avance.",
  ),
  pleonasm(
    "pleo-reunir-ensemble",
    "Pléonasme : « se réunir ensemble »",
    r`${B}(réun\p{L}*)${S}ensemble(?=${E})`,
    (m) => m[1]!,
    [
      { wrong: "Les fans se réunissent ensemble.", right: "Les fans se réunissent." },
      { wrong: "On va se réunir ensemble samedi.", right: "On va se réunir samedi." },
    ],
    "Se réunir suppose d'être ensemble.",
  ),
  pleonasm(
    "pleo-voire-meme",
    "Pléonasme : « voire même »",
    r`${B}voire${S}même(?=${E})`,
    "voire",
    [
      { wrong: "Trois rounds, voire même cinq.", right: "Trois rounds, voire cinq." },
      { wrong: "Serré, voire même indécis.", right: "Serré, voire indécis." },
    ],
    "Voire signifie déjà « et même ».",
  ),
  pleonasm(
    "pleo-reculer-arriere",
    "Pléonasme : « reculer en arrière »",
    r`${B}(recul\p{L}*)${S}en${S}arrière(?=${E})`,
    (m) => m[1]!,
    [
      { wrong: "Il recule en arrière sous la pression.", right: "Il recule sous la pression." },
      { wrong: "Il refuse de reculer en arrière.", right: "Il refuse de reculer." },
    ],
    "Reculer, c'est déjà aller en arrière.",
  ),
  pleonasm(
    "pleo-panacee",
    "Pléonasme : « panacée universelle »",
    r`${B}panacée${S}universelle(?=${E})`,
    "panacée",
    [
      {
        wrong: "La lutte n'est pas une panacée universelle.",
        right: "La lutte n'est pas une panacée.",
      },
      { wrong: "Le cardio, sa panacée universelle.", right: "Le cardio, sa panacée." },
    ],
    "Une panacée est par définition un remède universel.",
  ),
  pleonasm(
    "pleo-premiere-primeur",
    "Pléonasme : « en première primeur »",
    r`${B}(?:première|premier)${S}primeur(?=${E})`,
    "primeur",
    [
      {
        wrong: "En première primeur, l'annonce du main event.",
        right: "En primeur, l'annonce du main event.",
      },
      { wrong: "Une première primeur pour nos abonnés.", right: "Une primeur pour nos abonnés." },
    ],
    "Une primeur est déjà la première annonce.",
  ),
  pleonasm(
    "pleo-tous-unanimes",
    "Pléonasme : « tous unanimes »",
    r`${B}tous${S}unanimes(?=${E})`,
    "unanimes",
    [
      { wrong: "Les juges sont tous unanimes.", right: "Les juges sont unanimes." },
      {
        wrong: "Ils étaient tous unanimes après le combat.",
        right: "Ils étaient unanimes après le combat.",
      },
    ],
    "Unanimes signifie déjà « tous d'accord ».",
  ),
  pleonasm(
    "pleo-comme-par-exemple",
    "Pléonasme : « comme par exemple »",
    r`${B}comme${S}par${S}exemple(?=${E})`,
    "par exemple",
    [
      {
        wrong: "Des techniques au sol, comme par exemple la kimura.",
        right: "Des techniques au sol, par exemple la kimura.",
      },
      {
        wrong: "Des soumissions, comme par exemple un triangle.",
        right: "Des soumissions, par exemple un triangle.",
      },
    ],
    "Comme et par exemple introduisent tous deux un exemple.",
  ),
  pleonasm(
    "pleo-collaborer-ensemble",
    "Pléonasme : « collaborer ensemble »",
    r`${B}(collabor\p{L}*)${S}ensemble(?=${E})`,
    (m) => m[1]!,
    [
      { wrong: "Les deux camps collaborent ensemble.", right: "Les deux camps collaborent." },
      {
        wrong: "Ils vont collaborer ensemble sur le gala.",
        right: "Ils vont collaborer sur le gala.",
      },
    ],
    "Collaborer, c'est déjà travailler ensemble.",
  ),
  pleonasm(
    "pleo-sortir-dehors",
    "Pléonasme : « sortir dehors »",
    r`${B}(sort\p{L}*)${S}dehors(?=${E})`,
    (m) => m[1]!,
    [
      { wrong: "Il est sorti dehors saluer les fans.", right: "Il est sorti saluer les fans." },
      { wrong: "Sortez dehors après le gala.", right: "Sortez après le gala." },
    ],
    "Sortir, c'est déjà aller dehors.",
  ),
  pleonasm(
    "pleo-descendre-en-bas",
    "Pléonasme : « descendre en bas »",
    r`${B}(descend\p{L}*)${S}en${S}bas(?=${E})`,
    (m) => m[1]!,
    [
      { wrong: "Il descend en bas pour la pesée.", right: "Il descend pour la pesée." },
      {
        wrong: "Les fans descendent en bas des gradins.",
        right: "Les fans descendent des gradins.",
      },
    ],
    "Descendre, c'est déjà aller vers le bas.",
  ),
  pleonasm(
    "pleo-entraider-mutuellement",
    "Pléonasme : « s'entraider mutuellement »",
    r`${B}(entraid\p{L}*)${S}mutuellement(?=${E})`,
    (m) => m[1]!,
    [
      { wrong: "Ils s'entraident mutuellement au camp.", right: "Ils s'entraident au camp." },
      {
        wrong: "On s'entraide mutuellement avant les combats.",
        right: "On s'entraide avant les combats.",
      },
    ],
    "S'entraider signifie déjà s'aider l'un l'autre.",
  ),
  rule({
    ...syntax,
    id: "synt-phrase-longue",
    title: "Phrase de plus de 30 mots",
    explanation:
      "Au-delà de 30 mots, une phrase se lit mal sur un écran de téléphone. Coupez-la en deux.",
    examples: [
      {
        wrong:
          "Après une préparation de plusieurs mois dans son camp de Paris avec son coach et ses partenaires d'entraînement, Karim Fictif arrive enfin à la pesée avec un objectif très clair en tête pour le combat de samedi soir.",
        right:
          "Après plusieurs mois de préparation à Paris, Karim Fictif arrive à la pesée. Son objectif est clair pour samedi soir.",
      },
      {
        wrong:
          "Le public est venu en nombre pour soutenir les combattants de la soirée et il a donné de la voix du premier au dernier combat dans une ambiance que personne ici n'oubliera jamais vraiment.",
        right: "Le public est venu en nombre. Il a donné de la voix du premier au dernier combat.",
      },
    ],
    exactFix: false,
    detect: (text) => {
      const out: FrenchMatch[] = [];
      for (const m of text.matchAll(/[^.!?…\n]+[.!?…]*/gu)) {
        const words = m[0].match(/[\p{L}\p{N}]+(?:['’-][\p{L}\p{N}]+)*/gu) ?? [];
        if (words.length > 30) {
          const start = m.index + (m[0].length - m[0].trimStart().length);
          out.push({
            start,
            end: m.index + m[0].trimEnd().length,
            message: `Phrase de ${words.length} mots : coupez-la en deux.`,
          });
        }
      }
      return out;
    },
  }),
  rule({
    ...syntax,
    id: "synt-negation",
    confidence: "medium",
    title: "Négation incomplète : « ne » manquant",
    explanation:
      "À l'écrit, la négation garde ses deux parties : il ne lâche rien, ce n'est pas fini. L'oral les supprime, un post publié les garde.",
    examples: [
      { wrong: "Il lâche rien !", right: "Il ne lâche rien !" },
      { wrong: "C'est pas fini.", right: "Ce n'est pas fini." },
    ],
    alsoRight: ["Il ne lâche rien !", "Il n'a pas tremblé."],
    detect: (text) => {
      const out: FrenchMatch[] = [];
      for (const m of text.matchAll(
        new RegExp(r`${B}c${AP}est(?=${S}(?:pas|jamais|plus)${E})`, "giu"),
      ))
        out.push({
          start: m.index,
          end: m.index + m[0].length,
          replacement: keepCase(m[0], `ce n${m[0].charAt(1)}est`),
        });
      const verb = new RegExp(
        r`(?<=${B}(?:il|elle|ils|elles|je|tu|nous|vous|ça|cela)${S})\p{L}+(?=${S}(?:pas|jamais|rien)${E})`,
        "giu",
      );
      for (const m of text.matchAll(verb)) {
        if (/^(ne|n|pas|plus|non)$/i.test(m[0])) continue;
        const fixed = /^[aeéèêiouyh]/i.test(m[0]) ? `n'${m[0]}` : `ne ${m[0]}`;
        out.push({ start: m.index, end: m.index + m[0].length, replacement: fixed });
      }
      return out;
    },
  }),
  rule({
    ...syntax,
    id: "synt-ce-sont",
    title: "« ce sont » devant un pluriel",
    explanation:
      "Devant un nom pluriel, l'écrit soigné préfère « ce sont » : ce sont des guerriers. « C'est des » relève de l'oral.",
    examples: [
      { wrong: "C'est des guerriers.", right: "Ce sont des guerriers." },
      {
        wrong: "Ce soir, c'est deux styles qui s'affrontent.",
        right: "Ce soir, ce sont deux styles qui s'affrontent.",
      },
    ],
    alsoRight: ["C'est la guerre."],
    detect: regex(
      r`${B}c${AP}est(?=${S}(?:des|les|deux|trois|quatre|cinq|nos|vos|leurs|mes|ses|eux|elles)${E})`,
      "ce sont",
    ),
  }),
  rule({
    ...syntax,
    id: "synt-repetition",
    confidence: "medium",
    title: "Même mot répété de près",
    explanation:
      "Un même mot repris dans une fenêtre de quinze mots alourdit le texte. Cherchez un synonyme ou une reformulation.",
    examples: [
      {
        wrong: "Un combat intense, un combat serré et un combat fou.",
        right: "Un combat intense, serré et fou.",
      },
      { wrong: "Il frappe fort et il frappe encore.", right: "Il frappe fort et recommence." },
    ],
    exactFix: false,
    detect: (text) => {
      const words = wordsWithPositions(text);
      const out: FrenchMatch[] = [];
      for (let i = 0; i < words.length; i += 1) {
        const current = words[i]!;
        const key = normalizeText(current.word);
        if (key.length < 5 || isStopword(key) || /^\p{Lu}/u.test(current.word) || /\d/.test(key))
          continue;
        for (let j = Math.max(0, i - 15); j < i; j += 1) {
          if (normalizeText(words[j]!.word) === key) {
            out.push({
              start: current.start,
              end: current.end,
              message: `« ${current.word} » répété à quelques mots d'écart.`,
            });
            break;
          }
        }
      }
      return out;
    },
  }),
  rule({
    ...syntax,
    id: "synt-formules-ia",
    title: "Formule typique d'IA",
    explanation:
      "Ces tournures (« Dans un monde », « N'hésitez pas à ») sonnent comme un texte généré. La liste est celle de la règle éditoriale, modifiable dans ADN éditorial.",
    examples: [
      { wrong: "Dans un monde où tout va vite, il frappe.", right: "Il frappe vite." },
      { wrong: "N'hésitez pas à réserver.", right: "Réservez vite." },
    ],
    exactFix: false,
    detect: (text, ctx) => {
      const out: FrenchMatch[] = [];
      const lower = text.toLowerCase().replace(/’/g, "'");
      for (const formula of ctx.aiFormulas) {
        const needle = formula.toLowerCase().replace(/’/g, "'");
        let from = 0;
        for (;;) {
          const at = lower.indexOf(needle, from);
          if (at < 0) break;
          out.push({
            start: at,
            end: at + needle.length,
            message: `Formule typique d'IA : « ${formula} ».`,
          });
          from = at + needle.length;
        }
      }
      return out;
    },
  }),
  rule({
    ...syntax,
    id: "synt-veritable",
    title: "« Véritable » en ouverture",
    explanation:
      "Ouvrir un post par « Véritable… » est un tic d'écriture générée. Entrez directement dans le fait.",
    examples: [
      { wrong: "Véritable démonstration de Karim.", right: "Démonstration de Karim." },
      { wrong: "🔥 Véritable guerre dans la cage !", right: "🔥 Guerre dans la cage !" },
    ],
    exactFix: false,
    detect: regex(r`(?<=^[ \t \p{Extended_Pictographic}️‍]*)véritable(?=${E})`, undefined, {
      flags: "gimu",
    }),
  }),
  rule({
    ...syntax,
    id: "synt-exclamations",
    title: "Un seul point d'exclamation",
    explanation:
      "Un seul point d'exclamation suffit : quel KO ! Les signes répétés affaiblissent le ton au lieu de le renforcer.",
    examples: [
      { wrong: "Quel KO !!!", right: "Quel KO !" },
      { wrong: "Qui sera champion ??", right: "Qui sera champion ?" },
    ],
    detect: regex(r`!{2,}|\?{2,}`, (m) => m[0].charAt(0)),
  }),
  rule({
    ...syntax,
    id: "synt-anglicisme",
    confidence: "medium",
    title: "Anglicisme : un équivalent français existe",
    explanation:
      "Certains termes anglais ont un équivalent français courant : la pesée, la semaine du combat. Les termes consacrés (main event, fight card, face-off) restent acceptés.",
    examples: [
      { wrong: "La fight week commence lundi.", right: "La semaine du combat commence lundi." },
      { wrong: "Un vrai fighter.", right: "Un vrai combattant." },
    ],
    alsoRight: ["Le main event de la fight card."],
    detect: regex(r`${B}(?:${Object.keys(HINTED_ANGLICISMS).join("|")})(?=${E})`, (m, ctx) =>
      ctx.prefs.anglicismHints
        ? keepCase(m[0], HINTED_ANGLICISMS[m[0].toLowerCase()] ?? m[0])
        : null,
    ),
  }),
];
