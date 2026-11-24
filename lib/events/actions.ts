/** Écritures des fiches événements. La confirmation de suppression est à la charge de l'interface. */
import { newId } from "@/lib/database/hash";
import type { DataRepository } from "@/lib/database/repository";
import type { HexEvent } from "@/types/domain";
import { eventFromForm, type EventFormValues } from "./form";

export async function saveEvent(
  repository: DataRepository,
  values: EventFormValues,
  options: { existing?: HexEvent; now?: Date } = {},
): Promise<HexEvent> {
  return repository.events.put(
    eventFromForm(values, { id: options.existing?.id ?? newId(), now: options.now ?? new Date() }),
  );
}

/**
 * Supprime une fiche. Les publications et historiques qui la citaient perdent le lien ; une
 * Session Live déjà démarrée garde ses informations (copiées au démarrage).
 */
export async function deleteEvent(repository: DataRepository, event: HexEvent): Promise<void> {
  const [wordings, fighters] = await Promise.all([
    repository.wordings.list({ filter: (w) => w.eventId === event.id }),
    repository.fighters.list({ filter: (f) => f.fightHistory.some((h) => h.eventId === event.id) }),
  ]);
  await repository.wordings.bulkPut(wordings.map((w) => ({ ...w, eventId: undefined })));
  await repository.fighters.bulkPut(
    fighters.map((f) => ({
      ...f,
      fightHistory: f.fightHistory.map((h) =>
        h.eventId === event.id ? { ...h, eventId: undefined } : h,
      ),
    })),
  );
  await repository.events.delete(event.id);
}
