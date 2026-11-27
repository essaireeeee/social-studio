/**
 * Typographie française (section 6.3) : corrections automatiques, désactivables.
 * Espace fine U+202F avant ; ! ? (l'insécable U+00A0 est aussi acceptée, c'est ce que
 * produit le linter V1 et la « Compatibilité réseaux sociaux »), insécable avant :.
 */
import { B, E } from "../text";
import type { FrenchMatch } from "../types";
import { r, regex, rule } from "./helpers";

const NBSP = " ";
const NNBSP = " ";
const base = {
  family: "typographie",
  level: 1,
  severity: "warning",
  confidence: "high",
  autofix: true,
} as const;

/** Groupe les milliers par espaces insécables : 15000 → 15 000. */
const groupThousands = (digits: string) => digits.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);

export const TYPOGRAPHIE_RULES = [
  rule({
    ...base,
    id: "typo-espace-ponctuation-haute",
    title: "Espace fine avant ! ? ;",
    explanation:
      "En français, les signes doubles ! ? ; sont précédés d'une espace fine insécable. Elle empêche le signe de passer seul à la ligne.",
    examples: [
      { wrong: "Quel combat!", right: `Quel combat${NNBSP}!` },
      { wrong: "Qui sera champion?", right: `Qui sera champion${NNBSP}?` },
    ],
    alsoRight: [`Quel combat${NBSP}!`, "Quel KO ?!".replace(" ", NNBSP)],
    detect: regex(r`(?<=[\p{L}\p{N}»)\]"'’])[!?;]`, (m) => NNBSP + m[0]),
  }),
  rule({
    ...base,
    id: "typo-espace-insecable-ponctuation",
    title: "Espace insécable, pas une espace simple, avant ! ? ;",
    explanation:
      "Une espace ordinaire avant un point d'exclamation ou d'interrogation peut laisser le signe seul en début de ligne. L'espace fine insécable le garde attaché au mot.",
    examples: [
      { wrong: "Quel combat !", right: `Quel combat${NNBSP}!` },
      { wrong: "Prêt pour samedi ?", right: `Prêt pour samedi${NNBSP}?` },
    ],
    alsoRight: [`Quel combat${NNBSP}!`],
    detect: regex(r` (?=[!?;])`, NNBSP),
  }),
  rule({
    ...base,
    id: "typo-deux-points",
    title: "Espace insécable avant les deux-points",
    explanation:
      "Les deux-points sont précédés d'une espace insécable : programme : trois combats. Les heures (20:30) ne sont pas concernées.",
    examples: [
      { wrong: "Programme: trois combats.", right: `Programme${NBSP}: trois combats.` },
      { wrong: "Main event : Karim contre Tom.", right: `Main event${NBSP}: Karim contre Tom.` },
    ],
    alsoRight: [`Programme${NBSP}: trois combats.`, "Arrêt à 3:12 du 1er round."],
    detect: regex(r`(?<=[\p{L}»)])(?: )?:(?=[ \t\n]|$)`, () => `${NBSP}:`, { flags: "gmu" }),
  }),
  rule({
    ...base,
    id: "typo-guillemets",
    title: "Guillemets français « »",
    explanation:
      "Le français utilise les guillemets « », avec une espace insécable à l'intérieur. Les guillemets droits restent pour les liens et le code.",
    examples: [
      {
        wrong: 'Il a dit "je suis prêt" en conférence.',
        right: `Il a dit «${NBSP}je suis prêt${NBSP}» en conférence.`,
      },
      {
        wrong: '"Le roi est de retour", lance le coach.',
        right: `«${NBSP}Le roi est de retour${NBSP}», lance le coach.`,
      },
    ],
    alsoRight: [`«${NBSP}Je suis prêt${NBSP}»`],
    detect: regex(r`"([^"\n]{1,200})"`, (m) => `«${NBSP}${m[1]!.trim()}${NBSP}»`, {
      keepCase: false,
    }),
  }),
  rule({
    ...base,
    id: "typo-guillemets-espaces",
    title: "Espace insécable à l'intérieur des guillemets",
    explanation:
      "À l'intérieur des guillemets français, on place une espace insécable : « Je suis prêt ». Sans elle, le guillemet peut se retrouver seul en bout de ligne.",
    examples: [
      { wrong: "«Je suis prêt»", right: `«${NBSP}Je suis prêt${NBSP}»` },
      {
        wrong: "Il lance « Je suis prêt » au micro.",
        right: `Il lance «${NBSP}Je suis prêt${NBSP}» au micro.`,
      },
    ],
    alsoRight: [`«${NBSP}Je suis prêt${NBSP}»`],
    detect: regex(r`«(?![  ]) ?| ?(?<![  ])»`, (m) =>
      m[0].startsWith("«") ? `«${NBSP}` : `${NBSP}»`,
    ),
  }),
  rule({
    ...base,
    id: "typo-apostrophe-typographique",
    title: "Apostrophe typographique ’ (règle maison)",
    explanation:
      "Si la règle maison choisit l'apostrophe typographique, l'apostrophe droite ' devient ’. Le réglage se change dans l'Atelier Français.",
    examples: [
      { wrong: "C'est l'heure.", right: "C’est l’heure." },
      { wrong: "Aujourd'hui, j'y crois.", right: "Aujourd’hui, j’y crois." },
    ],
    alsoRight: ["C’est l’heure."],
    testPrefs: { apostrophe: "curly" },
    detect: regex(r`(?<=\p{L})'(?=\p{L})`, (_m, ctx) =>
      ctx.prefs.apostrophe === "curly" ? "’" : null,
    ),
  }),
  rule({
    ...base,
    id: "typo-apostrophe-droite",
    title: "Apostrophe droite ' (règle maison, défaut)",
    explanation:
      "Par défaut, la règle maison garde l'apostrophe droite, la plus sûre sur les réseaux. Une apostrophe typographique collée d'ailleurs est harmonisée.",
    examples: [
      { wrong: "C’est l’heure.", right: "C'est l'heure." },
      { wrong: "J’y crois.", right: "J'y crois." },
    ],
    alsoRight: ["C'est l'heure."],
    detect: regex(r`(?<=\p{L})’(?=\p{L})`, (_m, ctx) =>
      ctx.prefs.apostrophe === "straight" ? "'" : null,
    ),
  }),
  rule({
    ...base,
    id: "typo-points-suspension",
    title: "Points de suspension en un caractère : …",
    explanation:
      "Les points de suspension s'écrivent avec un seul caractère, « … ». Trois points séparés se coupent mal en fin de ligne.",
    examples: [
      { wrong: "Et le vainqueur est...", right: "Et le vainqueur est…" },
      { wrong: "Suspense... jusqu'au bout.", right: "Suspense… jusqu'au bout." },
    ],
    alsoRight: ["Suspense…"],
    detect: regex(r`(?<!\.)\.{3}(?!\.)`, "…"),
  }),
  rule({
    ...base,
    id: "typo-espace-avant-virgule",
    title: "Pas d'espace avant la virgule et le point",
    explanation:
      "La virgule et le point se collent au mot qui précède : il a gagné, par KO. Une espace avant est une faute de frappe.",
    examples: [
      { wrong: "Il a gagné , par KO.", right: "Il a gagné, par KO." },
      { wrong: "Fin du combat .", right: "Fin du combat." },
    ],
    alsoRight: ["Il a gagné, par KO."],
    detect: regex(r`(?<=\S)[   ]+(?=,|\.(?:[ \n]|$))`, "", { flags: "gmu" }),
  }),
  rule({
    ...base,
    id: "typo-espace-apres-virgule",
    title: "Une espace après la virgule",
    explanation:
      "La virgule est suivie d'une espace : rapide, précis, efficace. Entre deux chiffres (3,5 kilos), elle reste collée.",
    examples: [
      { wrong: "Rapide,précis, efficace.", right: "Rapide, précis, efficace." },
      { wrong: "Karim,Tom et Ali.", right: "Karim, Tom et Ali." },
    ],
    alsoRight: ["3,5 kilos."],
    detect: regex(r`,(?=\p{L})`, ", "),
  }),
  rule({
    ...base,
    id: "typo-nombre-unite",
    title: "Espace insécable entre le nombre et l'unité",
    explanation:
      "Le nombre et son unité ne doivent pas être séparés en fin de ligne : 70 kg, 3 rounds, 50 %. On les relie par une espace insécable.",
    examples: [
      { wrong: "Il pèse 70 kg.", right: `Il pèse 70${NBSP}kg.` },
      { wrong: "Il pèse 70kg à la pesée.", right: `Il pèse 70${NBSP}kg à la pesée.` },
    ],
    alsoRight: [`Il pèse 70${NBSP}kg.`, "En 2026."],
    detect: (text) => {
      const out: FrenchMatch[] = [];
      const spaced = new RegExp(
        r`(?<=\d) (?=(?:kg|kilos?|cm|km|rounds?|min|minutes|secondes|ans|€|%|places|combats|victoires|défaites)${E})`,
        "gu",
      );
      for (const m of text.matchAll(spaced))
        out.push({ start: m.index, end: m.index + 1, replacement: NBSP });
      for (const m of text.matchAll(new RegExp(r`(?<=\d)(?:kg|cm|km|€|%)(?=${E})`, "gu")))
        out.push({ start: m.index, end: m.index + m[0].length, replacement: NBSP + m[0] });
      return out;
    },
  }),
  rule({
    ...base,
    id: "typo-heure",
    title: "Heures au format maison : 21h",
    explanation:
      "La règle maison écrit les heures « 21h », comme la signature des posts (réglable en « 21 h »). Le format 20:30 est anglo-saxon.",
    examples: [
      { wrong: "Ouverture des portes à 19 h.", right: "Ouverture des portes à 19h." },
      { wrong: "Début des combats à 20:30.", right: "Début des combats à 20h30." },
    ],
    alsoRight: ["À 19h.", "Arrêt à 3:12 du 1er round."],
    detect: (text, ctx) => {
      const out: FrenchMatch[] = [];
      const spaced = ctx.prefs.hourFormat === "21 h";
      const glue = spaced ? NBSP : "";
      for (const m of text.matchAll(
        new RegExp(r`${B}(\d{1,2})([   ]?)([hH])(\d{2})?(?=${E})`, "gu"),
      )) {
        const fixed = `${m[1]}${glue}h${m[4] ?? ""}`;
        if (fixed !== m[0])
          out.push({ start: m.index, end: m.index + m[0].length, replacement: fixed });
      }
      for (const m of text.matchAll(/(?<![\d:])(0?[6-9]|1\d|2[0-3]):([0-5]\d)(?![\d:])/g))
        out.push({
          start: m.index,
          end: m.index + m[0].length,
          replacement: `${m[1]}${glue}h${m[2]}`,
        });
      return out;
    },
  }),
  rule({
    ...base,
    id: "typo-tirets",
    title: "Pas de tiret cadratin : virgule ou deux-points",
    explanation:
      "La charte maison n'emploie pas de tirets cadratins ni de tirets de dialogue. Une incise se met entre virgules, une précision finale après deux-points.",
    examples: [
      { wrong: "Karim — le crack — a encore frappé.", right: "Karim, le crack, a encore frappé." },
      { wrong: "Un seul objectif — la ceinture.", right: `Un seul objectif${NBSP}: la ceinture.` },
    ],
    alsoRight: ["Un week-end de contre-attaques."],
    detect: (text) => {
      const out: FrenchMatch[] = [];
      for (const line of linesOf(text)) {
        const dashes = [...line.text.matchAll(/[  ]*[—–][  ]*/g)];
        for (const m of dashes) {
          const start = line.start + m.index;
          const end = start + m[0].length;
          const atLineStart = line.text.slice(0, m.index).trim() === "";
          let replacement = ", ";
          if (atLineStart) replacement = "";
          else if (
            dashes.length === 1 &&
            /^[^,;:!?]{1,60}[.!?…]?\s*$/u.test(line.text.slice(m.index + m[0].length))
          )
            replacement = `${NBSP}: `;
          out.push({ start, end, replacement });
        }
      }
      return out;
    },
  }),
  rule({
    ...base,
    id: "typo-espaces-doubles",
    title: "Pas d'espace double",
    explanation:
      "Deux espaces de suite créent un trou visible dans le texte. Une seule espace suffit entre deux mots.",
    examples: [
      { wrong: "Quel  combat.", right: "Quel combat." },
      { wrong: "Il  a gagné.", right: "Il a gagné." },
    ],
    alsoRight: ["Quel combat."],
    detect: regex(r`(?<=\S) {2,}(?=\S)`, " "),
  }),
  rule({
    ...base,
    id: "typo-milliers",
    title: "Séparateur des milliers : 15 000",
    explanation:
      "Au-delà de 9 999, on groupe les chiffres par trois avec une espace insécable : 15 000 fans. Les années (2026) restent collées.",
    examples: [
      { wrong: "Plus de 15000 fans.", right: `Plus de 15${NBSP}000 fans.` },
      { wrong: "Un record de 120000 vues.", right: `Un record de 120${NBSP}000 vues.` },
    ],
    alsoRight: ["En 2026.", `15${NBSP}000 fans.`],
    detect: regex(r`(?<![\d.,  ])\d{5,}(?![\d.,])`, (m) => groupThousands(m[0])),
  }),
];

function linesOf(text: string): { text: string; start: number }[] {
  const out: { text: string; start: number }[] = [];
  let start = 0;
  for (const line of text.split("\n")) {
    out.push({ text: line, start });
    start += line.length + 1;
  }
  return out;
}
