/** Accords (section 6.3, niveaux 1 et 2). */
import {
  ADJECTIVES,
  COUNTABLE_NOUNS,
  FEMININE_NOUNS,
  MASCULINE_NOUNS,
  adjectiveBase,
} from "../lexicon";
import { AP, B, E, S, alt, keepCase } from "../text";
import { r, regex, rule } from "./helpers";

const base = { family: "accords", level: 1, severity: "error", confidence: "high" } as const;
const FEM = alt(FEMININE_NOUNS);
const MASC = alt(MASCULINE_NOUNS);
const COUNT = alt(COUNTABLE_NOUNS);
const FEM_SET = new Set<string>(FEMININE_NOUNS);
const plural = (noun: string) => (noun === "an" ? "ans" : `${noun}s`);

/** Formes masculines singulières dont le féminin diffère. */
const MASC_ADJ = alt(Object.keys(ADJECTIVES).filter((a) => ADJECTIVES[a]!.f !== a));
/** Formes féminines singulières dont le masculin diffère. */
const FEM_ADJ = alt(
  Object.entries(ADJECTIVES)
    .filter(([a, f]) => f.f !== a)
    .map(([, f]) => f.f),
);
/** Formes singulières (masculin ou féminin) dont le pluriel ajoute une marque. */
const SING_ADJ = alt([
  ...Object.keys(ADJECTIVES),
  ...Object.entries(ADJECTIVES)
    .filter(([a, f]) => f.f !== a)
    .map(([, f]) => f.f),
]);

export const ACCORD_RULES = [
  rule({
    ...base,
    id: "accord-quel-feminin",
    title: "« quelle » devant un nom féminin",
    explanation:
      "Le déterminant exclamatif s'accorde avec le nom : quel combat, quelle victoire. Devant un nom féminin, il faut « quelle ».",
    examples: [
      { wrong: "Quel victoire pour Karim !", right: "Quelle victoire pour Karim !" },
      { wrong: "Quel soirée à Paris !", right: "Quelle soirée à Paris !" },
    ],
    alsoRight: ["Quel combat !"],
    detect: regex(r`${B}quel(?=${S}(?:${FEM})${E})`, "quelle"),
  }),
  rule({
    ...base,
    id: "accord-quel-masculin",
    title: "« quel » devant un nom masculin",
    explanation:
      "Devant un nom masculin (combat, round, KO), le déterminant exclamatif reste « quel ». « Quelle » est réservé au féminin.",
    examples: [
      { wrong: "Quelle combat !", right: "Quel combat !" },
      { wrong: "Quelle round incroyable !", right: "Quel round incroyable !" },
    ],
    alsoRight: ["Quelle victoire !"],
    detect: regex(r`${B}quelle(?=${S}(?:${MASC})${E})`, "quel"),
  }),
  rule({
    ...base,
    id: "accord-determinant-pluriel",
    title: "Nom au pluriel après les, des, ces, nos",
    explanation:
      "Après un déterminant pluriel, le nom prend la marque du pluriel : ces combattants, les fans. Le déterminant donne le nombre à toute la phrase.",
    examples: [
      { wrong: "Merci à tous les fan présents.", right: "Merci à tous les fans présents." },
      { wrong: "Ces combattant ont tout donné.", right: "Ces combattants ont tout donné." },
    ],
    alsoRight: ["Les combattants sont prêts.", "Le combattant est prêt."],
    detect: regex(
      r`(?<=${B}(?:les|des|ces|mes|ses|nos|vos|leurs|plusieurs|quelques)${S})(?:${COUNT})(?=${E})`,
      (m) => keepCase(m[0], plural(m[0].toLowerCase())),
    ),
  }),
  rule({
    ...base,
    id: "accord-determinant-singulier",
    title: "Nom au singulier après un, le, ce, chaque",
    explanation:
      "Après un déterminant singulier, le nom reste au singulier : chaque round compte. « Chaque » est toujours suivi du singulier.",
    examples: [
      { wrong: "Un combattants a été blessé.", right: "Un combattant a été blessé." },
      { wrong: "Chaque rounds compte.", right: "Chaque round compte." },
    ],
    alsoRight: ["Les rounds sont serrés.", "Ce round compte."],
    detect: regex(
      r`(?<=${B}(?:un|une|le|la|ce|cette|mon|ma|son|sa|chaque|notre|votre)${S})(?:${COUNT})s(?=${E})`,
      (m) => m[0].slice(0, -1),
    ),
  }),
  rule({
    ...base,
    id: "accord-nombre",
    title: "Nom au pluriel après un nombre supérieur à un",
    explanation:
      "À partir de deux, le nom se met au pluriel : trois combats, cinq rounds. Zéro et un gardent le singulier.",
    examples: [
      {
        wrong: "Il a gagné ses trois combat par KO.",
        right: "Il a gagné ses trois combats par KO.",
      },
      { wrong: "Le combat se joue en cinq round.", right: "Le combat se joue en cinq rounds." },
    ],
    alsoRight: ["Un round suffit.", "Trois rounds intenses.", "1 round, 0 défaite."],
    detect: regex(
      r`(?<=${B}(?:deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|quinze|vingt|trente|cent|mille|[2-9]|[1-9]\d+)${S})(?:${COUNT}|an)(?=${E})`,
      (m) => keepCase(m[0], plural(m[0].toLowerCase())),
    ),
  }),
  rule({
    ...base,
    id: "accord-tous-les",
    title: "« tous les », « toutes les »",
    explanation:
      "Devant un déterminant pluriel, « tout » s'accorde : tous les fans, toutes les soirées. « Tout les » n'existe pas.",
    examples: [
      { wrong: "Merci à tout les fans.", right: "Merci à tous les fans." },
      { wrong: "Il a gagné tout les soirées.", right: "Il a gagné toutes les soirées." },
    ],
    alsoRight: ["Tous les fans sont là.", "Tout le public est debout."],
    detect: regex(r`${B}tout(?=${S}(?:les|ces|nos|vos|mes|ses|leurs)${S}(\p{L}+))`, (m) => {
      const noun = (m[1] ?? "").toLowerCase().replace(/s$/, "");
      return keepCase(m[0], FEM_SET.has(noun) ? "toutes" : "tous");
    }),
  }),
  rule({
    ...base,
    id: "accord-tout-le",
    title: "« tout le », « toute la »",
    explanation:
      "Devant un déterminant singulier, on écrit « tout » (masculin) ou « toute » (féminin) : tout le public, toute sa force. « Tous » ne se place que devant un pluriel.",
    examples: [
      { wrong: "Tous le public est debout.", right: "Tout le public est debout." },
      { wrong: "Il a donné tous sa force.", right: "Il a donné toute sa force." },
    ],
    alsoRight: ["Tous les fans.", "Tout le public."],
    detect: regex(r`${B}tous(?=${S}(?:(le|la|ce|cette|mon|ma|son|sa)${E}|l${AP}))`, (m) =>
      keepCase(m[0], /^(la|cette|ma|sa)$/i.test(m[1] ?? "") ? "toute" : "tout"),
    ),
  }),
  rule({
    ...base,
    id: "accord-meme",
    title: "« lui-même », « eux-mêmes » : trait d'union et accord",
    explanation:
      "Après un pronom, « même » s'attache par un trait d'union et s'accorde : lui-même, eux-mêmes. Il prend un s après un pronom pluriel.",
    examples: [
      { wrong: "Il s'est battu contre lui même.", right: "Il s'est battu contre lui-même." },
      { wrong: "Ils se sont dépassés eux même.", right: "Ils se sont dépassés eux-mêmes." },
    ],
    alsoRight: ["Elle-même l'a annoncé.", "Pour elle, même si elle perd, c'est une victoire."],
    detect: regex(
      r`${B}(lui|elle|eux|elles|nous|moi|toi|soi)(?:[  -])?(même|mêmes)${E}(?!${S}(?:si|pas|quand|lorsque)${E})`,
      (m) => {
        const pronoun = (m[1] ?? "").toLowerCase();
        const fixed = `${pronoun}-${["eux", "elles", "nous"].includes(pronoun) ? "mêmes" : "même"}`;
        return m[0].toLowerCase() === fixed ? null : keepCase(m[0], fixed);
      },
    ),
  }),
  rule({
    ...base,
    id: "accord-quelques",
    title: "« quelques » devant un nom pluriel",
    explanation:
      "Au sens de « plusieurs », « quelques » s'accorde : quelques jours, quelques places. « Quelque chose » reste au singulier.",
    examples: [
      {
        wrong: "Plus que quelque jours avant le gala.",
        right: "Plus que quelques jours avant le gala.",
      },
      { wrong: "Il reste quelque places.", right: "Il reste quelques places." },
    ],
    alsoRight: ["Quelque chose se prépare.", "Quelques places restantes."],
    detect: regex(
      r`${B}quelque(?=${S}(?:jours|semaines|mois|heures|minutes|secondes|rounds|combats|combattants|années|instants|places|billets|points)${E})`,
      "quelques",
    ),
  }),
  rule({
    ...base,
    id: "accord-quel-que-soit",
    level: 2,
    title: "« quel que soit », « quelle que soit »",
    explanation:
      "Devant le verbe être, « quel » s'écrit en deux mots et s'accorde avec le sujet : quel que soit le résultat, quelle que soit la décision. « Quelque soit » n'existe pas.",
    examples: [
      {
        wrong: "Quelque soit le résultat, il sera là.",
        right: "Quel que soit le résultat, il sera là.",
      },
      {
        wrong: "Quelque soit la décision, il l'accepte.",
        right: "Quelle que soit la décision, il l'accepte.",
      },
    ],
    alsoRight: ["Quel que soit le résultat."],
    detect: regex(
      r`${B}quelques?${S}(soit|soient)(?=${S}(le|la|les|l${AP}|son|sa|ses|cette|ce)(\p{L}*))`,
      (m) => {
        const det = (m[2] ?? "").toLowerCase();
        const next = (m[3] ?? "").toLowerCase().replace(/^\s+/, "");
        const fem = /^(la|sa|cette)$/.test(det) || (det.startsWith("l") && FEM_SET.has(next));
        const pluralForm = (m[1] ?? "").toLowerCase() === "soient";
        const head = pluralForm ? (fem ? "quelles" : "quels") : fem ? "quelle" : "quel";
        return keepCase(m[0], `${head} que ${pluralForm ? "soient" : "soit"}`);
      },
    ),
  }),
  rule({
    ...base,
    id: "accord-demi",
    level: 2,
    title: "« demi- » invariable devant le nom, « et demie » après",
    explanation:
      "Placé devant le nom avec un trait d'union, « demi » ne s'accorde pas : une demi-heure. Après le nom, il prend son genre : une heure et demie.",
    examples: [
      { wrong: "Une demie-heure de pesée.", right: "Une demi-heure de pesée." },
      { wrong: "Il a tenu une heure et demi.", right: "Il a tenu une heure et demie." },
    ],
    alsoRight: ["Une demi-heure.", "Deux rounds et demi."],
    detect: regex(
      r`${B}demie-(?=\p{L})|(?<=${B}(?:heure|minute|journée|semaine|saison)s?${S}et${S})demi${E}`,
      (m) => (m[0].toLowerCase() === "demi" ? keepCase(m[0], "demie") : keepCase(m[0], "demi-")),
    ),
  }),
  rule({
    ...base,
    id: "accord-nu-pieds",
    level: 2,
    title: "« nu-pieds », « nu-tête » : invariable devant le nom",
    explanation:
      "Placé devant le nom avec un trait d'union, « nu » ne s'accorde pas : il entre nu-pieds. Après le nom, il s'accorde : pieds nus.",
    examples: [
      { wrong: "Il entre nus-pieds dans la cage.", right: "Il entre nu-pieds dans la cage." },
      { wrong: "Elle salue le public nue-tête.", right: "Elle salue le public nu-tête." },
    ],
    alsoRight: ["Il entre nu-pieds.", "Il combat pieds nus."],
    detect: regex(r`${B}(?:nus|nues|nue)-(pieds|tête)${E}`, (m) => keepCase(m[0], `nu-${m[1]}`)),
  }),
  rule({
    ...base,
    id: "accord-couleurs",
    level: 2,
    severity: "warning",
    confidence: "medium",
    title: "Couleurs : orange, marron et couleurs composées invariables",
    explanation:
      "Une couleur tirée d'un nom (orange, marron) ou composée (bleu foncé) ne s'accorde pas. Les couleurs simples s'accordent : des gants rouges.",
    examples: [
      { wrong: "Il porte des gants oranges.", right: "Il porte des gants orange." },
      { wrong: "Des shorts bleus foncés.", right: "Des shorts bleu foncé." },
    ],
    alsoRight: ["Des gants rouges.", "Une ceinture orange."],
    detect: regex(
      r`(?<=${B}(?:shorts|gants|ceintures|tenues|maillots|couleurs|protège-dents|t-shirts)${S})(?:(oranges|marrons)|(bleu|rouge|vert|noir|jaune|gris|blanc)s?${S}(foncé|clair|vif|foncée|claire|vive)s?)(?=${E})`,
      (m) =>
        m[1] ? m[1].slice(0, -1) : `${m[2]} ${(m[3] ?? "").replace(/ve$/, "f").replace(/e$/, "")}`,
    ),
  }),
  rule({
    ...base,
    id: "accord-adjectif-pluriel",
    title: "Adjectif au pluriel après un nom pluriel",
    explanation:
      "L'adjectif prend le nombre du nom qu'il qualifie : deux combats incroyables, des fans fous. Le déterminant indique le pluriel.",
    examples: [
      { wrong: "Deux combats incroyable ce soir.", right: "Deux combats incroyables ce soir." },
      { wrong: "Des fans fou de joie.", right: "Des fans fous de joie." },
    ],
    alsoRight: ["Des combats incroyables.", "Les gants sont prêts."],
    detect: regex(
      r`(?<=${B}(?:les|des|ces|nos|vos|leurs|mes|ses|deux|trois|quatre|cinq)${S}\p{L}+[sx]${S})(?:${SING_ADJ})(?=${E})`,
      (m) => {
        const word = m[0].toLowerCase();
        const baseForm = adjectiveBase(word);
        if (!baseForm) return null;
        const forms = ADJECTIVES[baseForm]!;
        const fem = word === forms.f && forms.f !== baseForm;
        return keepCase(m[0], fem ? forms.fp : forms.mp);
      },
    ),
  }),
  rule({
    ...base,
    id: "accord-adjectif-feminin",
    title: "Adjectif au féminin après un nom féminin",
    explanation:
      "L'adjectif prend le genre du nom : une performance exceptionnelle, une soirée explosive. Un nom féminin appelle la forme féminine.",
    examples: [
      { wrong: "Une performance exceptionnel.", right: "Une performance exceptionnelle." },
      { wrong: "Une soirée explosif à Paris.", right: "Une soirée explosive à Paris." },
    ],
    alsoRight: ["Une performance exceptionnelle.", "Un combat exceptionnel."],
    detect: regex(
      r`(?<=${B}(?:une|la|cette|sa|ma|ta|notre|votre)${S}(?:${FEM})${S})(?:${MASC_ADJ})(?=${E})`,
      (m) => keepCase(m[0], ADJECTIVES[m[0].toLowerCase()]?.f ?? m[0]),
    ),
  }),
  rule({
    ...base,
    id: "accord-adjectif-masculin",
    title: "Adjectif au masculin après un nom masculin",
    explanation:
      "Un nom masculin (combat, round, main event) appelle l'adjectif au masculin : un combat exceptionnel. La forme féminine n'a pas sa place ici.",
    examples: [
      { wrong: "Un combat exceptionnelle.", right: "Un combat exceptionnel." },
      {
        wrong: "Le main event explosive de la soirée.",
        right: "Le main event explosif de la soirée.",
      },
    ],
    alsoRight: ["Un combat explosif.", "Une soirée explosive."],
    detect: regex(
      r`(?<=${B}(?:un|le|ce|cet|son|mon|ton|notre|votre)${S}(?:${MASC})${S})(?:${FEM_ADJ})(?=${E})`,
      (m) => {
        const baseForm = adjectiveBase(m[0]);
        return baseForm ? keepCase(m[0], baseForm) : null;
      },
    ),
  }),
];
