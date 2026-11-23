/**
 * Import d'un export Instagram (« Télécharger vos informations », format JSON), section 14.5.
 * Parseur défensif : cherche les légendes dans les structures connues (`media[].title`,
 * `title`, `string_map_data`) et la date (`creation_timestamp`). Aucun appel réseau, aucun
 * scraping : seul le fichier fourni par le CM est lu. Logique pure.
 */
import { normalizeText } from "@/lib/editorial/text-utils";

export interface InstagramPost {
  text: string;
  /** AAAA-MM-JJ */
  date?: string;
}

/** Texte composé uniquement de caractères 0 à 255 (octets relus un à un). */
const LATIN1_ONLY = new RegExp("^[\\u0000-\\u00ff]*$", "u");
/** Octet de tête UTF-8 suivi d'un octet de continuation : signe d'un texte mal décodé. */
const MOJIBAKE_HINT = new RegExp("[\\u00c2-\\u00f4][\\u0080-\\u00bf]", "u");

/**
 * Les exports Meta écrivent chaque octet UTF-8 comme un caractère distinct (un emoji
 * devient quatre caractères accentués). Les octets sont relus en UTF-8 ; si la relecture
 * échoue, le texte est gardé tel quel.
 */
export function fixMetaEncoding(value: string): string {
  if (!LATIN1_ONLY.test(value) || !MOJIBAKE_HINT.test(value)) return value;
  try {
    const bytes = Uint8Array.from(value, (char) => char.charCodeAt(0));
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return value;
  }
}

const toDate = (timestamp: unknown) =>
  typeof timestamp === "number" && timestamp > 0
    ? new Date(timestamp * 1000).toISOString().slice(0, 10)
    : undefined;

function fromStringMap(map: unknown): InstagramPost | undefined {
  if (!map || typeof map !== "object") return undefined;
  const entries = Object.entries(map as Record<string, unknown>);
  const caption = entries.find(([key]) => /caption|l[eé]gende|title|titre/i.test(key))?.[1] as
    { value?: unknown } | undefined;
  const time = entries.find(([key]) => /time|date|heure/i.test(key))?.[1] as
    { timestamp?: unknown } | undefined;
  return typeof caption?.value === "string"
    ? { text: caption.value, date: toDate(time?.timestamp) }
    : undefined;
}

export function parseInstagramExport(json: unknown): InstagramPost[] {
  const found: InstagramPost[] = [];
  const visit = (node: unknown, depth: number) => {
    if (depth > 8 || !node || typeof node !== "object") return;
    if (Array.isArray(node)) return node.forEach((child) => visit(child, depth + 1));
    const record = node as Record<string, unknown>;
    const fromMap = fromStringMap(record.string_map_data);
    if (fromMap) found.push(fromMap);
    if (typeof record.title === "string" && record.title.trim()) {
      found.push({ text: record.title, date: toDate(record.creation_timestamp) });
    }
    for (const [key, value] of Object.entries(record)) {
      if (key !== "string_map_data" && typeof value === "object") visit(value, depth + 1);
    }
  };
  visit(json, 0);

  // Une même légende figure souvent au niveau de la publication et de son média.
  const seen = new Set<string>();
  return found
    .map((post) => ({ ...post, text: fixMetaEncoding(post.text).trim() }))
    .filter((post) => {
      const key = normalizeText(post.text);
      if (!post.text || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}
