/** Liste chronologique des événements (section 15.2) : à venir, puis passés. */
import type { HexEvent } from "@/types/domain";

export interface EventTimeline {
  /** Du plus proche au plus lointain ; les événements sans date à la fin. */
  upcoming: HexEvent[];
  /** Du plus récent au plus ancien. */
  past: HexEvent[];
}

/** `today` : AAAA-MM-JJ. Un événement du jour est « à venir ». */
export function eventTimeline(events: readonly HexEvent[], today: string): EventTimeline {
  const dateOf = (e: HexEvent) => e.date?.slice(0, 10);
  const upcoming = events
    .filter((e) => !dateOf(e) || dateOf(e)! >= today)
    .sort((a, b) => {
      const da = dateOf(a);
      const db = dateOf(b);
      if (!da || !db) return da ? -1 : db ? 1 : a.name.localeCompare(b.name, "fr");
      return da.localeCompare(db);
    });
  const past = events
    .filter((e) => dateOf(e) && dateOf(e)! < today)
    .sort((a, b) => dateOf(b)!.localeCompare(dateOf(a)!));
  return { upcoming, past };
}

/** Prochain événement daté (aperçu des signatures, valeur par défaut). */
export function nextEvent(events: readonly HexEvent[], today: string): HexEvent | undefined {
  return eventTimeline(events, today).upcoming.find((e) => e.date);
}
