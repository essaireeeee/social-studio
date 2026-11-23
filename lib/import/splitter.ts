/**
 * Découpage d'un collage en publications (section 14.3) : une ligne qui ne contient que
 * `===` (trois signes égal ou plus) sépare deux publications. Logique pure.
 */
export const SEPARATOR = /^\s*={3,}\s*$/m;

export function splitPosts(text: string): string[] {
  return text
    .replace(/\r\n?/g, "\n")
    .split(new RegExp(SEPARATOR.source, "gm"))
    .map((post) => post.replace(/^\s*\n/u, "").replace(/\s+$/u, ""))
    .filter((post) => post.trim() !== "");
}
