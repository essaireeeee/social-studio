import { formatDate } from "@/lib/format";
import { eventLabelOf } from "@/lib/generation/native/context";
import type { HexEvent } from "@/types/domain";

/** Onglet « Événements » : fight cards et historique qui citent le combattant. */
export function FighterEvents({
  items,
}: {
  items: readonly { event: HexEvent; onCard: boolean }[];
}) {
  if (items.length === 0) {
    return <p className="text-13 text-muted-foreground">Aucun événement ne cite ce combattant.</p>;
  }
  return (
    <ul className="flex flex-col gap-2">
      {items.map(({ event, onCard }) => (
        <li
          key={event.id}
          className="flex items-center justify-between gap-3 rounded-md border border-border p-3 text-13"
        >
          <span className="font-medium">{eventLabelOf(event.name, event.number)}</span>
          <span className="text-xs text-muted-foreground">
            {event.date ? formatDate(event.date) : "Date à définir"} ·{" "}
            {onCard ? "Sur la fight card" : "Historique de combats"}
          </span>
        </li>
      ))}
    </ul>
  );
}
