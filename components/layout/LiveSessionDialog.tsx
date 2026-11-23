"use client";

import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useRepository } from "@/hooks/useRepository";
import {
  inputFromSession,
  startLiveSession,
  updateLiveSession,
  type LiveSessionInput,
} from "@/lib/shell/live-session";
import { useUiStore } from "@/stores/ui.store";
import { LiveSessionForm } from "./LiveSessionForm";

/** Démarrage ou modification de la Session Live (section 12.3). */
export function LiveSessionDialog() {
  const open = useUiStore((state) => state.sessionDialogOpen);
  const draft = useUiStore((state) => state.sessionDraft);
  const setOpen = useUiStore((state) => state.setSessionDialogOpen);
  const repository = useRepository();
  const session = useLiveSession();
  const editing = session ?? null;
  const initial: LiveSessionInput = editing
    ? inputFromSession(editing)
    : (draft ?? { eventName: "" });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent aria-describedby={undefined}>
        <div className="flex flex-col gap-1">
          <DialogTitle>
            {editing ? "Modifier la Session Live" : "Démarrer une Session Live"}
          </DialogTitle>
          <DialogDescription>
            Le contexte de la soirée pré-remplit les champs du Studio en LIVE SHOW. Une seule
            session est active à la fois.
          </DialogDescription>
        </div>
        {repository ? (
          <LiveSessionForm
            key={editing?.id ?? `new-${draft?.eventId ?? ""}`}
            initial={initial}
            submitLabel={editing ? "Enregistrer" : "Démarrer la session"}
            onCancel={() => setOpen(false)}
            onSubmit={async (values) => {
              if (editing) await updateLiveSession(repository, editing.id, values);
              else await startLiveSession(repository, values);
              setOpen(false);
            }}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
