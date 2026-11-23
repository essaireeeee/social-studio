"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useRepository } from "@/hooks/useRepository";
import { endLiveSession, sessionSummary } from "@/lib/shell/live-session";
import { useUiStore } from "@/stores/ui.store";

/** Confirmation avant d'archiver la Session Live (section 12.3). */
export function EndSessionDialog() {
  const open = useUiStore((state) => state.endSessionOpen);
  const setOpen = useUiStore((state) => state.setEndSessionOpen);
  const repository = useRepository();
  const session = useLiveSession();

  return (
    <AlertDialog open={open && Boolean(session)} onOpenChange={setOpen}>
      {session ? (
        <AlertDialogContent>
          <AlertDialogTitle>Terminer la Session Live ?</AlertDialogTitle>
          <AlertDialogDescription>
            La session {sessionSummary(session)[0]} sera archivée. Les générations déjà faites ne
            changent pas.
          </AlertDialogDescription>
          <div className="flex justify-end gap-2">
            <AlertDialogCancel asChild>
              <Button variant="secondary">Annuler</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                onClick={() => {
                  if (repository) void endLiveSession(repository, session.id);
                }}
              >
                Terminer la session
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      ) : null}
    </AlertDialog>
  );
}
