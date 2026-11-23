"use client";

import { Button } from "@/components/ui/button";
import { useLiveSession } from "@/hooks/useLiveSession";
import { sessionSummary } from "@/lib/shell/live-session";
import { useUiStore } from "@/stores/ui.store";

/** Barre Session Live (section 12.3), sous le header, en LIVE SHOW uniquement. */
export function LiveSessionBar() {
  const session = useLiveSession();
  const openDialog = () => useUiStore.getState().setSessionDialogOpen(true);

  if (session === undefined) {
    return <div className="h-10 border-b border-border bg-elevated" aria-hidden="true" />;
  }

  return (
    <section
      aria-label="Session Live"
      className="sticky top-13 z-20 flex min-h-10 flex-wrap items-center gap-x-3 gap-y-1 border-b border-border bg-elevated px-4 py-1.5 sm:px-6"
    >
      {session ? (
        <>
          <p className="flex min-w-0 flex-1 items-center gap-2 text-xs">
            <span
              className="size-2 shrink-0 animate-on-air rounded-full bg-live"
              aria-hidden="true"
            />
            <span className="font-mono font-semibold tracking-wider text-live">
              ÉVÉNEMENT ACTIF
            </span>
            <span className="truncate text-foreground">
              {sessionSummary(session).map((part, i) => (
                <span key={part}>
                  {i > 0 ? (
                    <span className="px-1.5 text-muted-foreground" aria-hidden="true">
                      ·
                    </span>
                  ) : null}
                  {part}
                </span>
              ))}
            </span>
          </p>
          <div className="flex gap-1.5">
            <Button size="sm" variant="secondary" onClick={openDialog}>
              Modifier
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => useUiStore.getState().setEndSessionOpen(true)}
            >
              Terminer
            </Button>
          </div>
        </>
      ) : (
        <>
          <p className="flex-1 text-xs text-muted-foreground">Aucune Session Live en cours.</p>
          <Button size="sm" onClick={openDialog}>
            Démarrer une Session Live
          </Button>
        </>
      )}
    </section>
  );
}
