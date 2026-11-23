/** Briefs valides aléatoires (graine fixe) pour les tests de propriété du moteur natif. */
import {
  CATEGORIES,
  categoryFieldKeys,
  getField,
  resolveFieldOptions,
  winnerChoices,
  type CategoryDef,
} from "@/lib/categories/registry";
import { createRng } from "@/lib/generation/random";
import {
  SettingsSchema,
  type Brief,
  type BriefFieldValue,
  type Fighter,
  type LiveSession,
  type Platform,
} from "@/types/domain";
import { NOW } from "./entities";

export const POOL_FIGHTERS: Fighter[] = [
  {
    id: "f-karim",
    firstName: "Karim",
    lastName: "Fictif",
    nickname: "Le Marteau",
    weightClass: "Poids légers",
    club: "Club Test",
    fightHistory: [],
    updatedAt: NOW,
    record: { wins: 12, losses: 3, draws: 0, asOf: "2026-10-01" },
  },
  { id: "f-lea", firstName: "Léa", lastName: "Brouillon", fightHistory: [], updatedAt: NOW },
  { id: "f-samba", firstName: "Samba", lastName: "Sima", fightHistory: [], updatedAt: NOW },
];

const NAMES = [
  "Karim Fictif",
  "Léa Brouillon",
  "Tom Essai",
  "Ana Exemple",
  "Samba Sima",
  "Jean-Marc De La Cruz",
  "Ali Ouvrard",
];
const PHRASES = [
  "Trois coups au 2e round et Karim Fictif lève les bras",
  "ambiance électrique à Lyon",
  "retour gagnant après 14 mois",
  "la salle de Marseille debout",
  "un combat engagé de bout en bout",
];
const EVENTS = ["HEXAGONE MMA 13", "HEXAGONE MMA", "Soirée Test Nantes"];
const PLATFORMS: Platform[] = ["instagram", "facebook", "x", "tiktok"];

export interface RandomBrief {
  brief: Brief;
  liveSession?: LiveSession;
  hashtags: string[];
}

function valueFor(
  key: string,
  category: CategoryDef,
  rng: () => number,
): BriefFieldValue | undefined {
  const def = getField(key);
  const one = <T>(items: readonly T[]) => items[Math.floor(rng() * items.length)]!;
  const settings = SettingsSchema.parse({});
  switch (def.type) {
    case "fighter":
      return def.multiple ? [one(NAMES), one(NAMES)] : one(NAMES);
    case "event":
      return one(EVENTS);
    case "chips":
    case "select": {
      const options = resolveFieldOptions(def, category, {
        settings,
        fightCard: ["Karim Fictif vs Tom Essai", "Léa Brouillon vs Ana Exemple"],
      });
      if (options.length === 0) return undefined;
      return def.multiple ? options.slice(0, 2) : one(options);
    }
    case "time":
      return def.timeFormat === "clock"
        ? one(["20h30", "19h", "21h15"])
        : `${1 + Math.floor(rng() * 4)}:${String(Math.floor(rng() * 60)).padStart(2, "0")}`;
    case "date":
      return one(["2026-12-05", "2027-03-14", "2027-06-21"]);
    case "url":
      return "https://exemple.fr/billets";
    case "toggle":
      return rng() > 0.5;
    default:
      return def.inputMode === "numeric" ? String(1 + Math.floor(rng() * 9)) : one(PHRASES);
  }
}

export function randomBriefs(count: number, seed = 42): RandomBrief[] {
  const rng = createRng(seed);
  const briefs: RandomBrief[] = [];
  for (let i = 0; i < count; i += 1) {
    const category = CATEGORIES[i % CATEGORIES.length]!;
    const fields: Record<string, BriefFieldValue | undefined> = { ...category.presets };
    for (const key of categoryFieldKeys(category)) {
      const required = category.required.includes(key);
      if (!required && rng() < 0.4) continue;
      const value = valueFor(key, category, rng);
      if (value !== undefined) fields[key] = value;
    }
    const choices = winnerChoices(category, fields);
    if (choices && choices.length > 0) fields.winner = choices[Math.floor(rng() * choices.length)];
    if (fields.method !== "Décision") delete fields.decisionType;
    fields.useRecord = rng() > 0.5;

    const liveSession: LiveSession | undefined =
      category.mode === "live" && rng() > 0.3
        ? {
            id: "session",
            eventName: "HEXAGONE MMA",
            eventNumber: 12,
            city: "Paris",
            venue: "Salle Test",
            broadcast: "RMC SPORT",
            startedAt: NOW,
            active: true,
          }
        : undefined;
    briefs.push({
      brief: {
        mode: category.mode,
        categoryId: category.id,
        platform: PLATFORMS[Math.floor(rng() * PLATFORMS.length)]!,
        fields,
        hashtagIds: [],
      },
      liveSession,
      hashtags: rng() > 0.3 ? ["#HexagoneMMA"] : [],
    });
  }
  return briefs;
}
