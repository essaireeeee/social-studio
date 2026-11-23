/**
 * Recherche de combattants (section 13.3) : floue sur prénom, nom et surnom dès
 * 2 caractères. Les combattants de la fight card de l'événement actif passent en premier.
 * Logique pure.
 */
import { normalizeText } from "@/lib/editorial/text-utils";
import type { Fighter } from "@/types/domain";

export const MIN_FIGHTER_QUERY = 2;

export const fighterName = (f: Pick<Fighter, "firstName" | "lastName">) =>
  `${f.firstName} ${f.lastName}`.trim();

/** Distance d'édition bornée à 1 (une lettre en trop, en moins ou différente). */
function withinOneEdit(a: string, b: string): boolean {
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i += 1;
      j += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (a.length > b.length) i += 1;
    else if (b.length > a.length) j += 1;
    else {
      i += 1;
      j += 1;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

function wordScore(query: string, word: string): number {
  if (word.startsWith(query)) return 3;
  if (word.includes(query)) return 2;
  // Faute de frappe sur le début du mot (« karin » pour « karim »).
  if (query.length >= 4 && withinOneEdit(query, word.slice(0, query.length))) return 1;
  return 0;
}

export function scoreFighter(query: string, fighter: Fighter): number {
  const words = normalizeText(`${fighter.firstName} ${fighter.lastName} ${fighter.nickname ?? ""}`)
    .split(" ")
    .filter(Boolean);
  const terms = normalizeText(query).split(" ").filter(Boolean);
  let total = 0;
  for (const term of terms) {
    const best = Math.max(0, ...words.map((word) => wordScore(term, word)));
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

export function searchFighters(
  query: string,
  fighters: readonly Fighter[],
  { priorityIds = [], limit = 8 }: { priorityIds?: readonly string[]; limit?: number } = {},
): Fighter[] {
  if (normalizeText(query).length < MIN_FIGHTER_QUERY) return [];
  const priority = new Set(priorityIds);
  return fighters
    .map((fighter) => ({ fighter, score: scoreFighter(query, fighter) }))
    .filter((r) => r.score > 0)
    .sort(
      (a, b) =>
        Number(priority.has(b.fighter.id)) - Number(priority.has(a.fighter.id)) ||
        b.score - a.score ||
        fighterName(a.fighter).localeCompare(fighterName(b.fighter), "fr"),
    )
    .slice(0, limit)
    .map((r) => r.fighter);
}
