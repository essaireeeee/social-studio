/**
 * Patrons d'accroche (section 8.4) : les noms propres connus deviennent {NOM} / {EVENT},
 * les nombres {N}, les emojis {E}, et on garde jusqu'au 3e mot restant.
 * Exemple : « 🔥 KO DE DUPONT AU R1 ! » → « {E} ko de {NOM} au {N} ».
 */
import type { Fighter, HexEvent } from "@/types/domain";
import { emojiRegex, literalPattern, normalizeText } from "./text-utils";

export interface NameMatchers {
  fighter: RegExp | null;
  event: RegExp;
}

const PLACEHOLDER = /^\{(E|N|NOM|EVENT)\}$/;
const BRAND_EVENT = `${literalPattern("HEXAGONE MMA")}(?:\\s+(?:#|n°\\s*)?\\d+)?`;

function alternation(names: Iterable<string>): string | null {
  const unique = [...new Set([...names].map((n) => n.trim()).filter((n) => n.length >= 3))];
  if (unique.length === 0) return null;
  return unique
    .sort((a, b) => b.length - a.length)
    .map(literalPattern)
    .join("|");
}

/**
 * Noms connus : nom complet, nom de famille et surnom des combattants ; nom des événements
 * (avec et sans numéro). « HEXAGONE MMA » suivi d'un numéro est toujours traité comme un événement.
 */
export function compileNameMatchers(
  fighters: readonly Pick<Fighter, "firstName" | "lastName" | "nickname">[] = [],
  events: readonly Pick<HexEvent, "name" | "number">[] = [],
): NameMatchers {
  const fighterNames = fighters.flatMap((f) => [
    `${f.firstName} ${f.lastName}`,
    f.lastName,
    f.nickname ?? "",
  ]);
  const eventNames = events.flatMap((e) => [e.name, e.number ? `${e.name} ${e.number}` : ""]);
  const fighter = alternation(fighterNames);
  const event = alternation(eventNames);
  return {
    fighter: fighter ? new RegExp(fighter, "giu") : null,
    event: new RegExp(event ? `${event}|${BRAND_EVENT}` : BRAND_EVENT, "giu"),
  };
}

/** Remplace les noms connus par des repères entourés d'espaces. */
export function maskNames(text: string, matchers: NameMatchers): string {
  let masked = text.replace(matchers.event, " {EVENT} ");
  if (matchers.fighter) masked = masked.replace(matchers.fighter, " {NOM} ");
  return masked;
}

export function hookPattern(hook: string, matchers: NameMatchers, maxWords = 3): string {
  const masked = maskNames(hook, matchers).replace(emojiRegex(), " {E} ");
  const tokens = masked.split(/\s+/).flatMap((token) => {
    if (PLACEHOLDER.test(token)) return [token];
    return normalizeText(token)
      .replace(/'/g, " ")
      .split(/[^\p{L}\p{N}]+/u)
      .filter(Boolean)
      .map((word) => (/\d/.test(word) ? "{N}" : word));
  });

  const pattern: string[] = [];
  let words = 0;
  for (const token of tokens) {
    const isPlaceholder = PLACEHOLDER.test(token);
    if (isPlaceholder && pattern.at(-1) === token) continue; // {E} {E} → {E}
    if (!isPlaceholder) {
      if (words === maxWords) break;
      words += 1;
    }
    pattern.push(token);
  }
  return pattern.join(" ");
}
