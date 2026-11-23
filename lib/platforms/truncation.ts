/**
 * Coupure des légendes dans l'aperçu (section 13.5). Calcul en graphèmes (`Intl.Segmenter`) :
 * un emoji composé compte pour un. Logique pure.
 *
 * Instagram : la partie visible s'arrête au premier des deux, `limit` graphèmes ou fin de la
 * 2e ligne ; une coupure au milieu d'un mot recule jusqu'à l'espace précédent, sauf pour un
 * mot de plus de 20 graphèmes.
 */
const segmenter = new Intl.Segmenter("fr", { granularity: "grapheme" });

export interface Truncation {
  visible: string;
  hidden: string;
  truncated: boolean;
  /** Graphèmes visibles avant « plus ». */
  visibleCount: number;
  limit: number;
  /** Longueur de l'accroche (1re ligne), en graphèmes. */
  hookLength: number;
  /** L'accroche ne tient pas entière dans la partie visible. */
  hookCut: boolean;
}

export interface TruncationOptions {
  /** Nombre de lignes visibles au plus (Instagram, TikTok : 2). Absent : pas de limite. */
  maxLines?: number;
  /** Au-delà, un mot coupé n'est pas reculé jusqu'à l'espace. */
  longWord?: number;
}

const graphemes = (text: string) => Array.from(segmenter.segment(text), (s) => s.segment);
const isSpace = (g: string | undefined) => g === undefined || /^\s$/u.test(g);

export function truncateCaption(
  text: string,
  limit: number,
  { maxLines, longWord = 20 }: TruncationOptions = {},
): Truncation {
  const chars = graphemes(text);
  const hookLength = graphemes(text.split("\n")[0] ?? "").length;
  let cut = Math.min(limit, chars.length);

  if (maxLines !== undefined) {
    let lines = 1;
    for (let i = 0; i < cut; i += 1) {
      if (chars[i] === "\n") {
        if (lines === maxLines) {
          cut = i;
          break;
        }
        lines += 1;
      }
    }
  }

  const truncated = cut < chars.length;
  if (truncated && !isSpace(chars[cut]) && !isSpace(chars[cut - 1])) {
    let start = cut;
    while (start > 0 && !isSpace(chars[start - 1])) start -= 1;
    let end = cut;
    while (end < chars.length && !isSpace(chars[end])) end += 1;
    if (end - start <= longWord && start > 0) cut = start;
  }

  const visible = chars.slice(0, cut).join("").replace(/\s+$/u, "");
  const visibleCount = graphemes(visible).length;
  return {
    visible,
    hidden: truncated ? chars.slice(cut).join("").replace(/^\s+/u, "") : "",
    truncated,
    visibleCount,
    limit,
    hookLength,
    hookCut: truncated && hookLength > visibleCount,
  };
}

export const INSTAGRAM_LINES = 2;
export const TIKTOK_LINES = 2;
/** Légende TikTok en surimpression : environ deux lignes courtes. */
export const TIKTOK_LIMIT = 80;

export function truncateInstagram(text: string, limit: number): Truncation {
  return truncateCaption(text, limit, { maxLines: INSTAGRAM_LINES });
}

export function truncateFacebook(text: string, limit: number): Truncation {
  return truncateCaption(text, limit);
}

export function truncateTikTok(text: string): Truncation {
  return truncateCaption(text, TIKTOK_LIMIT, { maxLines: TIKTOK_LINES });
}
