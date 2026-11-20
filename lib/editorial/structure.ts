/**
 * Empreinte de structure d'une publication (section 8.5) :
 * H accroche, B corps, I information factuelle, Q citation, C appel à l'action,
 * T bloc de hashtags, S signature. Exemple : « H-B-I-C-T ».
 */
import type { Signature } from "@/types/domain";
import { isCtaLine, lastTwoContentLines } from "./cta";
import { DEFAULT_CTA_LEXICON } from "./rules";
import { escapeRegex, isHashtagLine, normalizeText, splitParagraphs } from "./text-utils";

export type StructureBlock = "H" | "B" | "I" | "Q" | "C" | "T" | "S";

export interface StructureContext {
  signatures?: readonly Pick<Signature, "template">[];
  ctaLexicon?: readonly string[];
  /** Diffuseurs connus (options rapides) : une ligne qui les cite est une information. */
  broadcasters?: readonly string[];
}

const VARIATION_SELECTOR = new RegExp("\\uFE0F", "g");
const INFO_EMOJIS = ["🗓", "📅", "📍", "📺", "⏰", "🕗", "🏟", "📻", "🎥"];
const DAYS = /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche)\b/;
const MONTHS =
  /\b(janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)\b/;
const DATE_OR_TIME = /\b\d{1,2}\/\d{1,2}(\/\d{2,4})?\b|\b\d{1,2}h(\d{2})?\b|\bj-\d+\b/;
const BROADCAST = /\ben direct\b|\bdiffus|\ba partir de\b|\ben live\b/;

const stripVariation = (line: string) => line.replace(VARIATION_SELECTOR, "").trim();

/** Une expression par ligne de gabarit : les variables `{x}` acceptent n'importe quel texte. */
function signatureLineMatchers(template: string): RegExp[] {
  return template
    .split("\n")
    .map(stripVariation)
    .filter(Boolean)
    .map((line) => {
      const pattern = line
        .split(/\{[^}]+\}/)
        .map(escapeRegex)
        .join(".+?");
      return new RegExp(`^${pattern}$`, "u");
    });
}

function isInfoLine(line: string, broadcasters: readonly string[]): boolean {
  if (INFO_EMOJIS.some((emoji) => line.startsWith(emoji))) return true;
  const normalized = normalizeText(line);
  if (normalized.length > 90) return false;
  return (
    DAYS.test(normalized) ||
    MONTHS.test(normalized) ||
    DATE_OR_TIME.test(normalized) ||
    BROADCAST.test(normalized) ||
    broadcasters.some((name) => name.length > 2 && normalized.includes(normalizeText(name)))
  );
}

function isQuoteLine(line: string): boolean {
  const text = line.replace(/^[^\p{L}«"“]+/u, "");
  if (/^[«"“]/.test(text)) return true;
  const quoted = /«[^»]+»|“[^”]+”/.exec(line);
  return quoted !== null && quoted[0].length >= line.length * 0.5;
}

/** Lignes (indices globaux) appartenant à une signature connue. */
function signatureLines(
  paragraphs: string[][],
  signatures: StructureContext["signatures"],
): Set<string> {
  const marked = new Set<string>();
  for (const signature of signatures ?? []) {
    const matchers = signatureLineMatchers(signature.template);
    if (matchers.length === 0) continue;
    paragraphs.forEach((lines, p) => {
      const hits = lines
        .map((line, l) => ({
          key: `${p}:${l}`,
          ok: matchers.some((re) => re.test(stripVariation(line))),
        }))
        .filter((hit) => hit.ok);
      if (hits.length >= Math.min(2, matchers.length)) hits.forEach((hit) => marked.add(hit.key));
    });
  }
  return marked;
}

export function structureBlocks(text: string, context: StructureContext = {}): StructureBlock[] {
  const paragraphs = splitParagraphs(text);
  const lexicon = context.ctaLexicon ?? DEFAULT_CTA_LEXICON;
  const broadcasters = context.broadcasters ?? [];
  const signature = signatureLines(paragraphs, context.signatures);
  const ctaCandidates = new Set(
    lastTwoContentLines(text).filter((line) => isCtaLine(line, lexicon)),
  );

  const blocks: StructureBlock[] = [];
  let hookFound = false;

  paragraphs.forEach((lines, p) => {
    const paragraphBlocks: StructureBlock[] = [];
    lines.forEach((line, l) => {
      let block: StructureBlock;
      if (isHashtagLine(line)) block = "T";
      else if (signature.has(`${p}:${l}`)) block = "S";
      else if (!hookFound) block = "H";
      else if (isQuoteLine(line)) block = "Q";
      else if (ctaCandidates.has(line)) block = "C";
      else if (isInfoLine(line, broadcasters)) block = "I";
      else block = "B";
      if (block === "H") hookFound = true;
      if (paragraphBlocks.at(-1) !== block) paragraphBlocks.push(block);
    });
    for (const block of paragraphBlocks) {
      // Deux paragraphes de corps restent deux blocs ; les autres blocs consécutifs fusionnent.
      if (blocks.at(-1) === block && block !== "B") continue;
      blocks.push(block);
    }
  });
  return blocks;
}

export function structureFingerprint(text: string, context: StructureContext = {}): string {
  return structureBlocks(text, context).join("-");
}
