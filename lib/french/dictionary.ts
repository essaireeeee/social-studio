/**
 * Dictionnaire maison (section 6.2) : mots jamais signalés.
 * - Lexique MMA livré avec l'application.
 * - Noms tirés des fiches (combattants, événements, salles, villes, diffuseurs), calculés à
 *   la volée : un combattant renommé ne laisse aucun mot périmé.
 * - Ajouts du CM, enregistrés dans `frenchDictionary`.
 */
import type { Fighter, HexEvent, LiveSession } from "@/types/domain";
import type { FrenchDictionaryEntry, FrenchDictionaryKind } from "@/types/v2";

/** Lexique MMA : termes techniques et anglicismes consacrés, acceptés tels quels. */
export const MMA_LEXICON = [
  "soumission",
  "étranglement arrière",
  "guillotine",
  "clé de bras",
  "kimura",
  "triangle",
  "sprawl",
  "ground and pound",
  "cage",
  "octogone",
  "main event",
  "co-main event",
  "fight card",
  "face-off",
  "pesée",
  "KO",
  "TKO",
  "armbar",
  "rear naked choke",
  "takedown",
  "clinch",
  "uppercut",
  "jab",
  "crochet",
  "low kick",
  "middle kick",
  "high kick",
  "coup de genou",
  "demi-garde",
  "garde fermée",
  "back control",
  "d'arce",
  "anaconda",
  "heel hook",
  "kneebar",
  "omoplata",
  "americana",
  "spinning back fist",
  "superman punch",
  "sparring",
  "cardio",
  "striker",
  "grappler",
  "lutteur",
  "jiu-jitsu",
  "JJB",
  "muay-thaï",
  "kickboxing",
  "MMA",
  "prelims",
  "main card",
  "walkout",
  "challenger",
  "underdog",
  "finish",
  "game plan",
] as const;

/** Anglicismes acceptés sans signalement (paramètre « Anglicismes du MMA »). */
export const ACCEPTED_ANGLICISMS = [
  "main event",
  "co-main event",
  "fight card",
  "face-off",
  "ground and pound",
  "sprawl",
  "takedown",
  "clinch",
  "uppercut",
  "jab",
  "low kick",
  "high kick",
  "walkout",
  "challenger",
  "underdog",
  "finish",
  "game plan",
  "sparring",
  "striker",
  "grappler",
  "prelims",
  "main card",
] as const;

export interface DictionaryWord {
  word: string;
  kind: FrenchDictionaryKind;
  origin: FrenchDictionaryEntry["origin"];
  /** Fiche d'origine, pour les mots tirés des fiches. */
  source?: string;
}

export interface DictionarySources {
  fighters?: readonly Fighter[];
  events?: readonly HexEvent[];
  sessions?: readonly LiveSession[];
  entries?: readonly FrenchDictionaryEntry[];
}

function add(
  out: Map<string, DictionaryWord>,
  word: string | undefined,
  entry: Omit<DictionaryWord, "word">,
) {
  const value = word?.trim();
  if (!value || value.length < 2) return;
  const key = value.toLowerCase();
  if (!out.has(key)) out.set(key, { word: value, ...entry });
}

/** Mots tirés des fiches : noms, prénoms, surnoms, événements, salles, villes, diffuseurs. */
export function autoWords(sources: DictionarySources): DictionaryWord[] {
  const out = new Map<string, DictionaryWord>();
  for (const f of sources.fighters ?? []) {
    const source = `${f.firstName} ${f.lastName}`.trim();
    add(out, source, { kind: "fighter", origin: "auto", source });
    add(out, f.firstName, { kind: "fighter", origin: "auto", source });
    add(out, f.lastName, { kind: "fighter", origin: "auto", source });
    add(out, f.nickname, { kind: "fighter", origin: "auto", source });
  }
  for (const e of sources.events ?? []) {
    const source = e.number ? `${e.name} ${e.number}` : e.name;
    add(out, e.name, { kind: "event", origin: "auto", source });
    add(out, e.venue, { kind: "venue", origin: "auto", source });
    add(out, e.city, { kind: "city", origin: "auto", source });
    for (const b of e.broadcasters)
      add(out, b.name, { kind: "broadcaster", origin: "auto", source });
  }
  for (const s of sources.sessions ?? []) {
    const source = s.eventName;
    add(out, s.eventName, { kind: "event", origin: "auto", source });
    add(out, s.venue, { kind: "venue", origin: "auto", source });
    add(out, s.city, { kind: "city", origin: "auto", source });
  }
  return [...out.values()];
}

/** Ensemble en minuscules utilisé par le correcteur. */
export function buildDictionary(sources: DictionarySources): Set<string> {
  const words = new Set<string>();
  for (const w of MMA_LEXICON) words.add(w.toLowerCase());
  for (const w of autoWords(sources)) words.add(w.word.toLowerCase());
  for (const entry of sources.entries ?? []) words.add(entry.word.trim().toLowerCase());
  return words;
}

/** Lecture d'un import CSV : un mot par ligne ou première colonne, sans doublon. */
export function wordsFromCsv(rows: readonly (readonly string[])[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const row of rows) {
    const value = (row[0] ?? "").trim();
    if (!value || /^(mot|mots|word|terme)$/i.test(value)) continue;
    const key = value.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
}

export const MAX_DICTIONARY_WORD = 80;

/**
 * Entrées à créer pour des mots saisis ou importés par le CM : mots vides, trop longs ou
 * déjà connus du correcteur (fiches, lexique, dictionnaire) écartés.
 */
export function newEntries(
  words: readonly string[],
  known: ReadonlySet<string>,
  createdAt: string,
  makeId: () => string,
): { entries: FrenchDictionaryEntry[]; skipped: string[] } {
  const seen = new Set(known);
  const entries: FrenchDictionaryEntry[] = [];
  const skipped: string[] = [];
  for (const raw of words) {
    const word = raw.trim().replace(/\s+/g, " ");
    const key = word.toLowerCase();
    if (!word || word.length > MAX_DICTIONARY_WORD || seen.has(key)) {
      if (word) skipped.push(word);
      continue;
    }
    seen.add(key);
    entries.push({ id: makeId(), word, kind: "custom", origin: "cm", createdAt });
  }
  return { entries, skipped };
}

export const DICTIONARY_KIND_LABELS: Record<FrenchDictionaryKind, string> = {
  fighter: "Combattant",
  event: "Événement",
  venue: "Salle",
  city: "Ville",
  broadcaster: "Diffuseur",
  partner: "Partenaire",
  mma_lexicon: "Lexique MMA",
  anglicism: "Anglicisme",
  custom: "Ajout manuel",
};
