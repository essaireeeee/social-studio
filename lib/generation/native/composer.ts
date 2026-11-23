/**
 * Composeur : rend un modèle avec les variables d'un brief (section 10.2).
 * Choix des formulations par tirage déterministe, emplacements d'emojis, hashtags,
 * paragraphes et empreinte de structure. Logique pure.
 */
import { normalizeText } from "@/lib/editorial/text-utils";
import { pickWeighted } from "../random";
import type { Block, Segment, SegmentRole, Template, VariableMap } from "./types";

const EMOJI_SLOT = String.fromCharCode(0xe000);
const VARIABLE = /\{(\?)?([A-Za-z0-9_]+)(?:\|(upper|lower|cap))?\}/g;

/** « WINNER_UPPER » → « winner », « FIGHTER_A_UPPER » → « fighterA ». */
function upperAlias(name: string): string | null {
  const match = /^([A-Z0-9_]+)_UPPER$/.exec(name);
  if (!match) return null;
  const [first, ...rest] = match[1]!.toLowerCase().split("_");
  return first + rest.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join("");
}

function variablesOf(option: string): string[] {
  return [...option.matchAll(VARIABLE)]
    .map(([, , name]) => upperAlias(name!) ?? name!)
    .filter((name) => name !== "E");
}

export function isRenderable(option: string, vars: VariableMap): boolean {
  return variablesOf(option).every((name) => Boolean(vars[name]));
}

/** Variables exigées par toutes les options d'un segment : celles déclarées, sinon leur intersection. */
export function segmentRequires(segment: Segment): string[] {
  if (segment.requires) return [...segment.requires];
  const lists = segment.options.map(variablesOf);
  return (lists[0] ?? []).filter((name) => lists.every((list) => list.includes(name)));
}

export function renderOption(option: string, vars: VariableMap): string {
  return option.replace(
    VARIABLE,
    (_, hidden: string | undefined, name: string, transform?: string) => {
      if (name === "E") return EMOJI_SLOT;
      if (hidden) return "";
      const alias = upperAlias(name);
      const value = vars[alias ?? name] ?? "";
      const mode = alias ? "upper" : transform;
      if (mode === "upper") return value.toLocaleUpperCase("fr-FR");
      if (mode === "lower") return value.toLocaleLowerCase("fr-FR");
      if (mode === "cap") return value.charAt(0).toLocaleUpperCase("fr-FR") + value.slice(1);
      return value;
    },
  );
}

export interface ComposeOptions {
  vars: VariableMap;
  rng: () => number;
  /** Emojis classés par pertinence pour la catégorie. */
  emojis: readonly string[];
  emojiBudget: number;
  hashtagPosition: "end" | "inline" | "mixed";
  /** Ordre des blocs imposé (empreinte du profil pour la variante Signature). */
  order?: readonly Block[];
  /** Rôles à ne pas rendre (raccourcissement). */
  dropRoles?: ReadonlySet<SegmentRole>;
  /** Segments ajoutés après le corps principal (ex. règle Samba Sima). */
  extraSegments?: readonly Segment[];
}

export interface Composition {
  templateId: string;
  text: string;
  hook: string;
  blocks: Block[];
  /** Bloc de chaque paragraphe, dans l'ordre (avant fusion) : sert après un raccourcissement. */
  paragraphBlocks: Block[];
  structure: string;
  roles: SegmentRole[];
}

interface Paragraph {
  block: Block;
  lines: string[];
  verbatim: boolean;
}

function orderSegments(segments: readonly Segment[], order?: readonly Block[]): Segment[] {
  if (!order || order.length === 0) return [...segments];
  const hook = segments.filter((s) => s.block === "H");
  const rest = order
    .filter((block) => block !== "H")
    .filter((block, i, all) => all.indexOf(block) === i)
    .flatMap((block) => segments.filter((s) => s.block === block));
  return [...hook, ...rest];
}

function withExtras(segments: Segment[], extras?: readonly Segment[]): Segment[] {
  if (!extras?.length) return segments;
  const index = segments.findIndex((s) => s.role === "core" || s.role === "context");
  const at = index === -1 ? segments.length : index + 1;
  return [...segments.slice(0, at), ...extras, ...segments.slice(at)];
}

/** Texte comparable : sans emojis, casse, accents ni ponctuation. */
function comparable(line: string): string {
  return normalizeText(line.replaceAll(EMOJI_SLOT, " "))
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function trigrams(text: string): string[] {
  const words = text.split(" ").filter(Boolean);
  return words.slice(2).map((word, i) => `${words[i]} ${words[i + 1]} ${word}`);
}

/**
 * Élision devant une voyelle : « de Ali » → « d'Ali », « DE ALI » → « D'ALI ».
 * Jamais devant HEXAGONE (règle de la ligue : « de HEXAGONE MMA »).
 */
const ELISION =
  /(?<![\p{L}'’])([dD])[eE] (?!HEXAGONE)(?=[AEIOUYÀÂÄÉÈÊËÎÏÔÖÛÜÙaeiouyàâäéèêëîïôöûüù])/gu;

export function applyElision(text: string): string {
  return text.replace(ELISION, "$1'");
}

/** Majuscule au premier caractère alphabétique de la ligne (hors citations et hashtags). */
function capitalizeLine(line: string): string {
  return line.replace(
    /^([^\p{L}\p{N}#«"“]*)(\p{Ll})/u,
    (_, prefix: string, letter: string) => prefix + letter.toLocaleUpperCase("fr-FR"),
  );
}

function fillEmojis(text: string, emojis: readonly string[], budget: number): string {
  let used = 0;
  const filled = text.replace(new RegExp(EMOJI_SLOT, "g"), () => {
    const emoji = used < budget ? emojis[used] : undefined;
    used += 1;
    return emoji ?? "";
  });
  return filled
    .split("\n")
    .map((line) => line.replace(/ {2,}/g, " ").trim())
    .join("\n");
}

export function collapseBlocks(blocks: readonly Block[]): Block[] {
  const result: Block[] = [];
  for (const block of blocks) {
    if (result.at(-1) === block && block !== "B") continue;
    result.push(block);
  }
  return result;
}

export function compose(template: Template, options: ComposeOptions): Composition | null {
  const { vars, rng } = options;
  const segments = withExtras(
    orderSegments(template.segments, options.order),
    options.extraSegments,
  );
  const paragraphs: Paragraph[] = [];
  const roles: SegmentRole[] = [];
  let hashtags: string | undefined;

  for (const segment of segments) {
    if (options.dropRoles?.has(segment.role) && segment.block !== "H") continue;
    if (segmentRequires(segment).some((name) => !vars[name])) {
      if (segment.block === "H") return null;
      continue;
    }
    // Une même ligne (ou une ligne déjà contenue dans une autre) n'apparaît jamais deux fois.
    const written = paragraphs.flatMap((p) => p.lines).map(comparable);
    const usable = segment.options.filter((option) => {
      if (!isRenderable(option, vars)) return false;
      const candidate = comparable(renderOption(option, vars));
      return (
        candidate !== "" &&
        !written.some((line) => line.includes(candidate) || candidate.includes(line))
      );
    });
    if (usable.length === 0) {
      if (segment.block === "H") return null;
      continue;
    }
    // Formulations favorisées : celles qui utilisent plus de faits, et qui ne répètent pas
    // une suite de 3 mots déjà écrite (« au 1er round » une seule fois).
    const seen = new Set(written.flatMap(trigrams));
    const fresh = usable.filter(
      (o) => !trigrams(comparable(renderOption(o, vars))).some((t) => seen.has(t)),
    );
    const option = pickWeighted(
      rng,
      fresh.length > 0 ? fresh : usable,
      (o) => 1 + variablesOf(o).length,
    );
    const line = applyElision(renderOption(option, vars).trim());
    if (!line) continue;
    roles.push(segment.role);

    if (segment.block === "T") {
      hashtags = line;
      continue;
    }
    const last = paragraphs.at(-1);
    if (segment.join && last && last.block !== "H" && last.block !== "S") last.lines.push(line);
    else paragraphs.push({ block: segment.block, lines: [line], verbatim: segment.block === "Q" });
  }

  if (!paragraphs.some((p) => p.block === "H")) return null;

  if (hashtags) {
    const lastText = [...paragraphs].reverse().find((p) => p.block !== "H" && p.block !== "S");
    if (options.hashtagPosition === "inline" && lastText) {
      lastText.lines[lastText.lines.length - 1] += ` ${hashtags}`;
    } else {
      paragraphs.push({ block: "T", lines: [hashtags], verbatim: true });
    }
  }

  const text = fillEmojis(
    paragraphs
      .map((p) => p.lines.map((line) => (p.verbatim ? line : capitalizeLine(line))).join("\n"))
      .join("\n\n"),
    options.emojis,
    options.emojiBudget,
  );
  const blocks = collapseBlocks(paragraphs.map((p) => p.block));
  return {
    templateId: template.id,
    text,
    hook: text.split("\n")[0] ?? "",
    blocks,
    paragraphBlocks: paragraphs.map((p) => p.block),
    structure: blocks.join("-"),
    roles,
  };
}
