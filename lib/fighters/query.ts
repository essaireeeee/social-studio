/** Liste des combattants (section 15.1) : filtres et liens vers publications et événements. */
import { normalizeText } from "@/lib/editorial/text-utils";
import type { Fighter, HexEvent, Wording } from "@/types/domain";

export interface FighterFilters {
  text?: string;
  weightClass?: string;
  club?: string;
}

const fullName = (f: Fighter) => `${f.firstName} ${f.lastName}`.trim();

export function filterFighters(fighters: readonly Fighter[], filters: FighterFilters): Fighter[] {
  const needle = normalizeText(filters.text ?? "");
  return fighters
    .filter((f) => {
      if (filters.weightClass && f.weightClass !== filters.weightClass) return false;
      if (filters.club && f.club !== filters.club) return false;
      if (!needle) return true;
      return [fullName(f), f.nickname ?? "", f.club ?? ""].some((v) =>
        normalizeText(v).includes(needle),
      );
    })
    .sort(
      (a, b) =>
        a.lastName.localeCompare(b.lastName, "fr") || a.firstName.localeCompare(b.firstName, "fr"),
    );
}

/** Valeurs distinctes d'un champ, triées (listes des filtres). */
export function distinctValues(
  fighters: readonly Fighter[],
  key: "weightClass" | "club",
): string[] {
  return [...new Set(fighters.map((f) => f[key]).filter((v): v is string => Boolean(v)))].sort(
    (a, b) => a.localeCompare(b, "fr"),
  );
}

/** Publications de la bibliothèque reliées au combattant, les plus récentes d'abord. */
export function fighterWordings(wordings: readonly Wording[], fighterId: string): Wording[] {
  return wordings
    .filter((w) => w.fighterIds.includes(fighterId))
    .sort((a, b) => (b.date ?? b.createdAt).localeCompare(a.date ?? a.createdAt));
}

/** Événements où le combattant figure : fight card ou historique de combats. */
export function fighterEvents(
  events: readonly HexEvent[],
  fighter: Fighter,
): { event: HexEvent; onCard: boolean }[] {
  const fromHistory = new Set(fighter.fightHistory.map((f) => f.eventId).filter(Boolean));
  return events
    .map((event) => ({
      event,
      onCard: event.fightCard.some(
        (fight) => fight.fighterAId === fighter.id || fight.fighterBId === fighter.id,
      ),
    }))
    .filter(({ event, onCard }) => onCard || fromHistory.has(event.id))
    .sort((a, b) => (b.event.date ?? "").localeCompare(a.event.date ?? ""));
}
