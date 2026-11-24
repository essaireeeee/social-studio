/**
 * Fiche combattant (section 15.1) : valeurs du formulaire, contrôles et conversion en
 * `Fighter`. Le palmarès est toujours daté (`asOf`). Logique pure.
 */
import { FighterSchema, type Fighter } from "@/types/domain";

export const FIGHT_RESULTS = ["W", "L", "D", "NC"] as const;
export type FightResult = (typeof FIGHT_RESULTS)[number];

export const RESULT_LABELS: Record<FightResult, string> = {
  W: "Victoire",
  L: "Défaite",
  D: "Nul",
  NC: "Sans décision",
};

export interface FightRow {
  /** Clé locale de la ligne (édition du tableau). */
  key: string;
  date: string;
  opponent: string;
  result: FightResult;
  method: string;
  eventId: string;
}

export interface FighterFormValues {
  firstName: string;
  lastName: string;
  nickname: string;
  nationality: string;
  weightClass: string;
  club: string;
  wins: string;
  losses: string;
  draws: string;
  nc: string;
  recordAsOf: string;
  bio: string;
  fightHistory: FightRow[];
  editorialNotes: string;
  internalNotes: string;
}

export type FighterFormErrors = Partial<Record<string, string>>;

let rowCounter = 0;
export const newFightRow = (row: Partial<FightRow> = {}): FightRow => ({
  key: `fight-${(rowCounter += 1)}`,
  date: "",
  opponent: "",
  result: "W",
  method: "",
  eventId: "",
  ...row,
});

const str = (value: number | undefined) => (value === undefined ? "" : String(value));

export function fighterForm(fighter?: Fighter): FighterFormValues {
  return {
    firstName: fighter?.firstName ?? "",
    lastName: fighter?.lastName ?? "",
    nickname: fighter?.nickname ?? "",
    nationality: fighter?.nationality ?? "",
    weightClass: fighter?.weightClass ?? "",
    club: fighter?.club ?? "",
    wins: str(fighter?.record?.wins),
    losses: str(fighter?.record?.losses),
    draws: str(fighter?.record?.draws),
    nc: str(fighter?.record?.nc),
    recordAsOf: fighter?.record?.asOf.slice(0, 10) ?? "",
    bio: fighter?.bio ?? "",
    fightHistory: (fighter?.fightHistory ?? []).map((f) =>
      newFightRow({
        date: f.date.slice(0, 10),
        opponent: f.opponent,
        result: f.result,
        method: f.method ?? "",
        eventId: f.eventId ?? "",
      }),
    ),
    editorialNotes: fighter?.editorialNotes ?? "",
    internalNotes: fighter?.internalNotes ?? "",
  };
}

const COUNT = /^\d{1,3}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Le palmarès est renseigné dès qu'un de ses chiffres l'est. */
export const hasRecord = (v: FighterFormValues) =>
  [v.wins, v.losses, v.draws, v.nc].some((x) => x.trim() !== "");

export function fighterFormErrors(values: FighterFormValues): FighterFormErrors {
  const errors: FighterFormErrors = {};
  if (!values.lastName.trim()) errors.lastName = "Le nom est requis.";
  if (hasRecord(values)) {
    for (const key of ["wins", "losses", "draws"] as const) {
      if (!COUNT.test(values[key].trim())) errors[key] = "Nombre entier attendu.";
    }
    if (values.nc.trim() && !COUNT.test(values.nc.trim())) errors.nc = "Nombre entier attendu.";
    if (!DATE.test(values.recordAsOf)) {
      errors.recordAsOf = "Indiquez à quelle date ce palmarès est exact.";
    }
  }
  values.fightHistory.forEach((row, i) => {
    if (!DATE.test(row.date)) errors[`fight-${i}-date`] = "Date requise.";
    if (!row.opponent.trim()) errors[`fight-${i}-opponent`] = "Adversaire requis.";
  });
  return errors;
}

const opt = (value: string) => value.trim() || undefined;

/** Fiche prête à enregistrer ; `updatedAt` passe à `now`. */
export function fighterFromForm(
  values: FighterFormValues,
  options: { id: string; now: Date },
): Fighter {
  return FighterSchema.parse({
    id: options.id,
    firstName: values.firstName.trim(),
    lastName: values.lastName.trim(),
    nickname: opt(values.nickname),
    nationality: opt(values.nationality),
    weightClass: opt(values.weightClass),
    club: opt(values.club),
    record: hasRecord(values)
      ? {
          wins: Number(values.wins),
          losses: Number(values.losses),
          draws: Number(values.draws),
          nc: values.nc.trim() ? Number(values.nc) : undefined,
          asOf: values.recordAsOf,
        }
      : undefined,
    bio: opt(values.bio),
    fightHistory: [...values.fightHistory]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((row) => ({
        date: row.date,
        opponent: row.opponent.trim(),
        result: row.result,
        method: opt(row.method),
        eventId: opt(row.eventId),
      })),
    editorialNotes: opt(values.editorialNotes),
    internalNotes: opt(values.internalNotes),
    updatedAt: options.now.toISOString(),
  });
}
