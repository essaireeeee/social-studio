"use client";

import { Radio, Trash2 } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/directory/ConfirmDialog";
import { UpdatedNote } from "@/components/directory/UpdatedNote";
import { Button } from "@/components/ui/button";
import type { DirectoryData } from "@/hooks/useDirectoryData";
import { useMode } from "@/hooks/useMode";
import { useRepository } from "@/hooks/useRepository";
import { deleteEvent } from "@/lib/events/actions";
import { eventLabelOf } from "@/lib/generation/native/context";
import { inputFromEvent } from "@/lib/shell/live-session";
import { toast } from "@/stores/toast.store";
import { useUiStore } from "@/stores/ui.store";
import type { HexEvent } from "@/types/domain";
import { EventForm } from "./EventForm";

interface EventDetailProps {
  event?: HexEvent;
  data: DirectoryData;
  onSaved: (event: HexEvent) => void;
  onDeleted: () => void;
}

/** Fiche événement, démarrage de la Session Live, suppression. */
export function EventDetail({ event, data, onSaved, onDeleted }: EventDetailProps) {
  const repository = useRepository();
  const { setMode } = useMode();
  const [confirming, setConfirming] = useState(false);

  if (!event) {
    return (
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Nouvel événement</h2>
        <EventForm fighters={data.fighters} onSaved={onSaved} />
      </div>
    );
  }

  const startSession = () => {
    void setMode("live");
    useUiStore.getState().setSessionDialogOpen(true, inputFromEvent(event));
  };
  const remove = async () => {
    if (!repository) return;
    await deleteEvent(repository, event);
    toast("Événement supprimé", "success");
    onDeleted();
  };

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold">{eventLabelOf(event.name, event.number)}</h2>
          <UpdatedNote at={event.updatedAt} />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            disabled={data.session !== null}
            title={data.session ? "Une Session Live est déjà en cours." : undefined}
            onClick={startSession}
          >
            <Radio aria-hidden="true" />
            Démarrer la Session Live pour cet événement
          </Button>
          <Button variant="ghost" onClick={() => setConfirming(true)}>
            <Trash2 aria-hidden="true" />
            Supprimer
          </Button>
        </div>
      </header>
      {data.session ? (
        <p className="text-xs text-muted-foreground">
          Session Live en cours : {eventLabelOf(data.session.eventName, data.session.eventNumber)}.
          Terminez-la pour en démarrer une autre.
        </p>
      ) : null}
      <EventForm
        key={`${event.id}-${event.updatedAt}`}
        event={event}
        fighters={data.fighters}
        onSaved={onSaved}
      />
      <ConfirmDialog
        open={confirming}
        title="Supprimer cet événement ?"
        description="Les publications et historiques de combats qui le citent perdent le lien. Une Session Live déjà démarrée garde ses informations. Cette action est définitive."
        confirmLabel="Supprimer"
        onConfirm={() => void remove()}
        onClose={() => setConfirming(false)}
      />
    </div>
  );
}
