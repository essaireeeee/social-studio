/** Participe passé (section 6.3, niveaux 2 et 3). */
import { FEMININE_NOUNS } from "../lexicon";
import { AP, B, E, S, alt, keepCase } from "../text";
import { r, regex, rule } from "./helpers";

const base = {
  family: "participe_passe",
  level: 2,
  severity: "error",
  confidence: "high",
} as const;
const FEM = alt(FEMININE_NOUNS);

/** Noms et adjectifs en -er qui ne sont pas des infinitifs. */
const NOT_INFINITIVE = new Set([
  "premier",
  "dernier",
  "léger",
  "fier",
  "cher",
  "hier",
  "super",
  "poker",
  "leader",
  "manager",
  "fighter",
  "enfer",
  "hiver",
  "amer",
  "mer",
  "fer",
  "ver",
  "entier",
  "régulier",
  "particulier",
  "familier",
  "singulier",
  "officier",
  "quartier",
  "dossier",
  "métier",
  "chantier",
  "sentier",
  "palier",
  "boucher",
  "rocher",
  "clocher",
  "danger",
  "étranger",
  "boxer",
  "power",
  "sparring",
]);
/** Noms en -é qui ne sont pas des participes (les mots en -té le sont rarement). */
const NOT_PARTICIPLE =
  /(?:té|café|degré|marché|défilé|résumé|procédé|carré|député|curé|fossé|côté|comité|thé|bébé)$/i;

const toInfinitive = (m: RegExpExecArray) =>
  NOT_PARTICIPLE.test(m[0]) ? null : m[0].slice(0, -1) + "er";
const toParticiple = (m: RegExpExecArray) =>
  NOT_INFINITIVE.has(m[0].toLowerCase()) ? null : m[0].slice(0, -2) + "é";

/** Sujet trouvé juste avant la correspondance (« ils », « elles », « elle »). */
const subjectBefore = (m: RegExpExecArray) => {
  const before = m.input.slice(Math.max(0, m.index - 40), m.index).toLowerCase();
  const found = before.match(/(?:^|[^\p{L}])(ils|elles|elle|il|on)\s+[^\s]*\s*[^\s]*\s*$/u);
  return found?.[1];
};

export const PARTICIPE_RULES = [
  rule({
    ...base,
    id: "pp-avoir-sujet",
    title: "Avec avoir, le participe ne s'accorde pas avec le sujet",
    explanation:
      "Avec l'auxiliaire avoir, le participe ne s'accorde jamais avec le sujet : elles ont gagné. Il ne s'accorde qu'avec un complément placé avant (la ceinture qu'elle a remportée).",
    examples: [
      { wrong: "Elles ont gagnées par décision.", right: "Elles ont gagné par décision." },
      { wrong: "Elle a remportée la ceinture.", right: "Elle a remporté la ceinture." },
    ],
    alsoRight: ["La ceinture qu'elle a remportée.", "Elles sont arrivées.", "Ils ont des idées."],
    detect: regex(
      r`(?<=(?<!qu${AP}[ ]?)${B}(?:ils|elles|il|elle|on|nous|vous)${S}(?:ont|avons|avez|a)${S})\p{L}{3,}?(?:és|ées|ée)(?=${E})`,
      (m) => m[0].replace(/(?:és|ées|ée)$/i, "é"),
    ),
  }),
  rule({
    ...base,
    id: "pp-cod-avant",
    level: 3,
    severity: "warning",
    confidence: "medium",
    title: "Avec avoir et un complément placé avant, le participe s'accorde",
    explanation:
      "Quand le complément d'objet est placé avant le verbe (la victoire qu'il a obtenue), le participe s'accorde avec lui. Vérifiez à quoi renvoie « que ».",
    examples: [
      {
        wrong: "La victoire qu'il a obtenu restera.",
        right: "La victoire qu'il a obtenue restera.",
      },
      { wrong: "La ceinture qu'elle a défendu.", right: "La ceinture qu'elle a défendue." },
    ],
    alsoRight: ["Le combat qu'il a gagné.", "La ceinture qu'elle a défendue."],
    detect: regex(
      r`(?<=${B}(?:${FEM})${S}qu${AP}[ ]?(?:il|elle|on|ils|elles)${S}(?:a|ont|avait|avaient)${S})\p{L}{3,}[éiu](?=${E})`,
      (m) => `${m[0]}e`,
    ),
  }),
  rule({
    ...base,
    id: "pp-etre-pluriel",
    title: "Avec être, le participe s'accorde avec un sujet pluriel",
    explanation:
      "Avec l'auxiliaire être, le participe s'accorde avec le sujet : ils sont arrivés, elles sont qualifiées. Le sujet pluriel appelle un s.",
    examples: [
      { wrong: "Ils sont arrivé à la pesée.", right: "Ils sont arrivés à la pesée." },
      {
        wrong: "Elles sont qualifié pour la finale.",
        right: "Elles sont qualifiées pour la finale.",
      },
    ],
    alsoRight: ["Ils sont arrivés.", "Ils sont prêts."],
    detect: regex(
      r`(?<=${B}(?:ils|elles)${S}(?:sont|étaient|seront|furent|seraient)${S})\p{L}{3,}(?:é|ée)(?=${E})`,
      (m) => {
        const stem = m[0].replace(/ée?$/i, "é");
        return subjectBefore(m) === "elles" ? `${stem}es` : `${stem}s`;
      },
    ),
  }),
  rule({
    ...base,
    id: "pp-etre-feminin",
    title: "Avec être, le participe s'accorde avec un sujet féminin",
    explanation:
      "Avec être, le participe prend le genre du sujet : elle est arrivée. Le sujet féminin appelle un e.",
    examples: [
      { wrong: "Elle est arrivé en forme.", right: "Elle est arrivée en forme." },
      { wrong: "Elle était qualifié depuis mai.", right: "Elle était qualifiée depuis mai." },
    ],
    alsoRight: ["Elle est arrivée.", "Elle a gagné."],
    detect: regex(r`(?<=${B}elle${S}(?:est|était|sera|fut|serait)${S})\p{L}{3,}é(?=${E})`, (m) =>
      NOT_PARTICIPLE.test(m[0]) ? null : `${m[0]}e`,
    ),
  }),
  rule({
    ...base,
    id: "pp-pronominal",
    level: 3,
    title: "Verbes pronominaux : accord avec le sujet sans complément après",
    explanation:
      "Sans complément après le verbe, le participe d'un verbe pronominal s'accorde avec le sujet : ils se sont imposés. Avec un complément (ils se sont serré la main), il reste invariable.",
    examples: [
      { wrong: "Ils se sont imposé aux points.", right: "Ils se sont imposés aux points." },
      { wrong: "Elle s'est imposé par soumission.", right: "Elle s'est imposée par soumission." },
    ],
    alsoRight: ["Ils se sont serré la main.", "Elle s'est imposée."],
    detect: regex(
      r`(?:(?<=${B}(?:ils|elles)${S}se${S}sont${S})|(?<=${B}elle${S}s${AP}est${S}))\p{L}{3,}é(?=${E})(?!${S}(?:(?:la|le|les|un|une|des|leur|leurs)${E}|l${AP}))`,
      (m) => {
        const subject = subjectBefore(m);
        if (subject === "elles") return `${m[0]}es`;
        if (subject === "ils") return `${m[0]}s`;
        return `${m[0]}e`;
      },
    ),
  }),
  rule({
    ...base,
    id: "pp-infinitif-apres-modal",
    level: 1,
    title: "Infinitif après pour, sans, aller, devoir, pouvoir",
    explanation:
      "Après une préposition ou un verbe comme aller, pouvoir ou devoir, le verbe se met à l'infinitif : il va gagner. Astuce : remplacez par « mordre », si « mordu » sonne faux, il faut l'infinitif.",
    examples: [
      { wrong: "Il va gagné ce soir.", right: "Il va gagner ce soir." },
      {
        wrong: "Il travaille pour décroché la ceinture.",
        right: "Il travaille pour décrocher la ceinture.",
      },
    ],
    alsoRight: ["Il a gagné.", "Il va côté vestiaire.", "Il peut être fier."],
    detect: regex(
      r`(?<=${B}(?:pour|sans|afin de|avant de|va|vont|vais|doit|doivent|peut|peuvent|veut|veulent|faut|pouvoir|vouloir|aller)${S})\p{L}{2,}é(?=${E})`,
      toInfinitive,
    ),
  }),
  rule({
    ...base,
    id: "pp-avoir-participe",
    level: 1,
    title: "Participe passé après avoir : -é, pas -er",
    explanation:
      "Après l'auxiliaire avoir, le verbe est au participe passé : il a gagné. Astuce : remplacez par « mordu », si ça sonne juste, il faut -é.",
    examples: [
      { wrong: "Il a gagner par KO.", right: "Il a gagné par KO." },
      { wrong: "Ils ont dominer le combat.", right: "Ils ont dominé le combat." },
    ],
    alsoRight: ["Il a gagné.", "Il a hier remporté le titre."],
    detect: regex(
      r`(?<=${B}(?:il|elle|on|ils|elles|tu|nous|vous|qui)${S}(?:a|ont|avons|avez|as|avait|avaient)${S})\p{L}{2,}er(?=${E})`,
      toParticiple,
    ),
  }),
  rule({
    ...base,
    id: "pp-etre-participe",
    level: 1,
    title: "Participe passé après être : -é, pas -er",
    explanation:
      "Après le verbe être, le verbe est au participe passé, accordé avec le sujet : il est arrivé. L'infinitif en -er n'a pas sa place ici.",
    examples: [
      { wrong: "Il est arriver hier soir.", right: "Il est arrivé hier soir." },
      { wrong: "Il est rester invaincu.", right: "Il est resté invaincu." },
    ],
    alsoRight: ["Il est premier.", "Il est fier."],
    detect: regex(
      r`(?<=${B}(?:il|elle|ils|elles|on)${S}(?:est|sont|était|étaient|sera|seront)${S})\p{L}{2,}er(?=${E})`,
      (m) => {
        const participle = toParticiple(m);
        if (!participle) return null;
        const subject = subjectBefore(m);
        const ending =
          subject === "elle" ? "e" : subject === "ils" ? "s" : subject === "elles" ? "es" : "";
        return keepCase(m[0], participle + ending);
      },
    ),
  }),
];
