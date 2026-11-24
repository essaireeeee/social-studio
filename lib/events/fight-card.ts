/**
 * Fight card en cours d'édition (section 15.2) : combats ordonnés, construits par
 * glisser-déposer depuis la liste des combattants ou au clavier. Un combattant ne figure
 * que dans un seul combat. Logique pure.
 */
import type { HexEvent } from "@/types/domain";

export type CardPosition = HexEvent["fightCard"][number]["position"];
export type Side = "A" | "B";

export const POSITION_LABELS: Record<CardPosition, string> = {
  main: "Main event",
  "co-main": "Co-main event",
  card: "Carte principale",
  prelim: "Préliminaires",
};

export interface FightSlot {
  key: string;
  fighterAId: string;
  fighterBId: string;
  weightClass: string;
  position: CardPosition;
  title: boolean;
}

let counter = 0;
export const newFight = (slot: Partial<FightSlot> = {}): FightSlot => ({
  key: `bout-${(counter += 1)}`,
  fighterAId: "",
  fighterBId: "",
  weightClass: "",
  position: "card",
  title: false,
  ...slot,
});

/** Retire le combattant de tous les combats (avant de le placer ailleurs). */
function without(card: readonly FightSlot[], fighterId: string): FightSlot[] {
  return card.map((fight) => ({
    ...fight,
    fighterAId: fight.fighterAId === fighterId ? "" : fight.fighterAId,
    fighterBId: fight.fighterBId === fighterId ? "" : fight.fighterBId,
  }));
}

/** Place un combattant dans un coin d'un combat ; `""` vide le coin. */
export function placeFighter(
  card: readonly FightSlot[],
  key: string,
  side: Side,
  fighterId: string,
): FightSlot[] {
  const cleared = fighterId ? without(card, fighterId) : [...card];
  return cleared.map((fight) =>
    fight.key !== key
      ? fight
      : { ...fight, [side === "A" ? "fighterAId" : "fighterBId"]: fighterId },
  );
}

/** Dépôt sur « Nouveau combat » : le combattant ouvre un combat, coin A. */
export function addFightWith(card: readonly FightSlot[], fighterId: string): FightSlot[] {
  return [...without(card, fighterId), newFight({ fighterAId: fighterId })];
}

export function moveFight(card: readonly FightSlot[], from: number, to: number): FightSlot[] {
  if (from === to || from < 0 || to < 0 || from >= card.length || to >= card.length) {
    return [...card];
  }
  const next = [...card];
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved!);
  return next;
}

export const updateFight = (
  card: readonly FightSlot[],
  key: string,
  patch: Partial<Omit<FightSlot, "key">>,
): FightSlot[] => card.map((fight) => (fight.key === key ? { ...fight, ...patch } : fight));

export const removeFight = (card: readonly FightSlot[], key: string): FightSlot[] =>
  card.filter((fight) => fight.key !== key);

/** Identifiants déjà placés sur la carte. */
export const fightersOnCard = (card: readonly FightSlot[]): Set<string> =>
  new Set(card.flatMap((f) => [f.fighterAId, f.fighterBId]).filter(Boolean));

export function cardErrors(card: readonly FightSlot[]): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const fight of card) {
    if (!fight.fighterAId || !fight.fighterBId) {
      errors[fight.key] = "Combat incomplet : choisissez deux combattants.";
    }
  }
  return errors;
}

export const slotsFromEvent = (event?: HexEvent): FightSlot[] =>
  (event?.fightCard ?? []).map((fight) =>
    newFight({
      fighterAId: fight.fighterAId,
      fighterBId: fight.fighterBId,
      weightClass: fight.weightClass ?? "",
      position: fight.position,
      title: fight.title ?? false,
    }),
  );

export const fightCardOf = (card: readonly FightSlot[]): HexEvent["fightCard"] =>
  card.map((fight) => ({
    fighterAId: fight.fighterAId,
    fighterBId: fight.fighterBId,
    weightClass: fight.weightClass.trim() || undefined,
    position: fight.position,
    title: fight.title || undefined,
  }));
