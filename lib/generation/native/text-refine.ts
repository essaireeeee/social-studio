/**
 * Retouches natives qui transforment le texte courant (section 11.4) : raccourcir,
 * couper les phrases longues, ton institutionnel, emojis. Elles partent du texte affiché,
 * y compris s'il a été modifié par le CM. Aucune n'ajoute d'information. Logique pure.
 */
import { isCtaLine } from "@/lib/editorial/cta";
import {
  countGraphemes,
  emojiRegex,
  isHashtagLine,
  listEmojis,
  normalizeText,
} from "@/lib/editorial/text-utils";
import type { VariableMap } from "./types";

/** Résidus d'emojis : sélecteur de variante, liaison, touche. */
const EMOJI_RESIDUE = new RegExp("[\\uFE0F\\u200D\\u20E3]", "g");
/** Mots en capitales qui restent en capitales dans un ton institutionnel. */
const KEEP_CAPS = new Set(["HEXAGONE", "MMA", "KO", "TKO", "VS", "MAIN", "CO-MAIN"]);
const MAX_WORDS = 15;
/** « ?! » et « ! », espaces (insécables compris) avant. */
const QUESTION_BANG = new RegExp("[\\s\\u00A0\\u202F]*\\?!+", "g");
const BANG = new RegExp("[\\s\\u00A0\\u202F]*!+", "g");

type ParagraphKind = "H" | "B" | "C" | "S" | "T";

export interface ShortenContext {
  vars: VariableMap;
  ctaLexicon?: readonly string[];
}

const paragraphsOf = (text: string) => text.split(/\n\s*\n/).filter((p) => p.trim() !== "");
const join = (paragraphs: readonly string[]) => paragraphs.join("\n\n");

function classify(paragraph: string, index: number, ctx: ShortenContext): ParagraphKind {
  const lines = paragraph.split("\n").filter((l) => l.trim());
  if (index === 0) return "H";
  if (lines.every(isHashtagLine)) return "T";
  if (ctx.vars.signature && normalizeText(paragraph) === normalizeText(ctx.vars.signature)) {
    return "S";
  }
  const last = lines.at(-1) ?? "";
  const cta = ctx.vars.cta && normalizeText(last).includes(normalizeText(ctx.vars.cta));
  if (cta || (lines.length === 1 && isCtaLine(last, ctx.ctaLexicon))) return "C";
  return "B";
}

/**
 * Raccourcit vers 70 % de la longueur : retire les paragraphes de corps secondaires en
 * partant de la fin, puis l'appel à l'action. L'accroche et le premier paragraphe de
 * corps restent. Renvoie le texte inchangé s'il n'y a rien à retirer.
 */
export function shortenText(text: string, ctx: ShortenContext): string {
  const target = Math.max(60, Math.round(countGraphemes(text) * 0.7));
  let paragraphs = paragraphsOf(text);
  const kinds = paragraphs.map((p, i) => classify(p, i, ctx));
  const firstBody = kinds.indexOf("B");
  const order = [
    ...kinds.flatMap((k, i) => (k === "B" && i !== firstBody ? [i] : [])).reverse(),
    ...kinds.flatMap((k, i) => (k === "C" ? [i] : [])),
  ];
  const removed = new Set<number>();
  for (const index of order) {
    if (countGraphemes(join(paragraphs.filter((_, i) => !removed.has(i)))) <= target) break;
    removed.add(index);
  }
  paragraphs = paragraphs.filter((_, i) => !removed.has(i));
  if (removed.size > 0) return join(paragraphs);

  // Rien à retirer : dernière ligne du premier paragraphe de corps s'il en compte plusieurs.
  if (firstBody !== -1) {
    const lines = paragraphs[firstBody]!.split("\n");
    if (lines.length > 1) {
      paragraphs[firstBody] = lines.slice(0, -1).join("\n");
      return join(paragraphs);
    }
  }
  return text;
}

const wordCount = (sentence: string) =>
  sentence.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;

const capitalize = (value: string) =>
  value.replace(
    /^([^\p{L}\p{N}]*)(\p{Ll})/u,
    (_, p: string, l: string) => p + l.toLocaleUpperCase("fr-FR"),
  );

/** Coupe une phrase trop longue à la virgule ou à la conjonction la plus proche du milieu. */
export function splitLongSentence(sentence: string): string {
  if (wordCount(sentence) <= MAX_WORDS) return sentence;
  const cuts = [...sentence.matchAll(/,?\s+(?:et|mais|puis|car)\s+|,\s+/g)]
    .map((m) => ({ start: m.index, end: m.index + m[0].length }))
    .filter(
      (cut) =>
        wordCount(sentence.slice(0, cut.start)) >= 4 && wordCount(sentence.slice(cut.end)) >= 4,
    );
  if (cuts.length === 0) return sentence;
  const middle = sentence.length / 2;
  const cut = cuts.reduce((a, b) =>
    Math.abs(b.start - middle) < Math.abs(a.start - middle) ? b : a,
  );
  const head = sentence.slice(0, cut.start).replace(/[\s,;:]+$/, "");
  const tail = capitalize(sentence.slice(cut.end));
  return `${head}. ${splitLongSentence(tail)}`;
}

/** Phrases de plus de 15 mots coupées, hors accroche, hashtags et signature. */
export function cutLongSentences(text: string, signature?: string): string {
  return paragraphsOf(text)
    .map((paragraph, index) => {
      if (index === 0) return paragraph;
      if (signature && normalizeText(paragraph) === normalizeText(signature)) return paragraph;
      return paragraph
        .split("\n")
        .map((line) =>
          isHashtagLine(line)
            ? line
            : line
                .split(/(?<=[.!?…])\s+/)
                .map(splitLongSentence)
                .join(" "),
        )
        .join("\n");
    })
    .join("\n\n");
}

function tidy(text: string): string {
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]{2,}/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function removeEmojis(text: string): string {
  return tidy(text.replace(emojiRegex(), "").replace(EMOJI_RESIDUE, ""));
}

/** Garde les `max` premiers emojis, retire les suivants. */
export function limitEmojis(text: string, max: number): string {
  let seen = 0;
  return tidy(
    text.replace(emojiRegex(), (emoji) => {
      seen += 1;
      return seen <= max ? emoji : "";
    }),
  );
}

/** Ajoute des emojis en tête de l'accroche puis des paragraphes de corps. */
export function addEmojis(text: string, emojis: readonly string[], budget: number): string {
  const pool = [...new Set(emojis)].slice(0, Math.max(0, budget));
  if (pool.length === 0) return text;
  let next = 0;
  return join(
    paragraphsOf(text).map((paragraph, index) => {
      const lines = paragraph.split("\n");
      if (next >= pool.length || lines.every(isHashtagLine)) return paragraph;
      if (index > 0 && next === 0) return paragraph;
      lines[0] = `${pool[next++]} ${lines[0]!.trim()}`;
      return lines.join("\n");
    }),
  );
}

export const hasEmojis = (text: string) => listEmojis(text).length > 0;

/**
 * Ton institutionnel : un emoji au plus, pas d'exclamation, capitales ramenées à la casse
 * normale (les noms retrouvent la casse saisie dans le brief).
 */
export function institutionalText(text: string, vars: VariableMap): string {
  let result = limitEmojis(text, 1);
  for (const value of new Set(Object.values(vars))) {
    if (value.length < 2 || value.includes("\n")) continue;
    const upper = value.toLocaleUpperCase("fr-FR");
    if (upper !== value) result = result.split(upper).join(value);
  }
  const lines = result.split("\n").map((line) => {
    if (isHashtagLine(line)) return line;
    const lowered = line.replace(/[\p{Lu}][\p{Lu}'’-]{2,}/gu, (word) =>
      KEEP_CAPS.has(word) ? word : word.toLocaleLowerCase("fr-FR"),
    );
    return capitalize(
      lowered
        .replace(QUESTION_BANG, " ?")
        .replace(BANG, ".")
        .replace(/\.(\s*\.)+/g, "."),
    );
  });
  return tidy(lines.join("\n"));
}
