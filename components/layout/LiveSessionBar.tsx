"use client";

import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useLiveSession } from "@/hooks/useLiveSession";
import { sessionSummary } from "@/lib/shell/live-session";
import { useUiStore } from "@/stores/ui.store";

/** Barre Session Live (section 12.3), sous la barre de navigation, en LIVE SHOW uniquement. */
export function LiveSessionBar() {
  const session = useLiveSession();
  const ref = useRef<HTMLElement | null>(null);
  // Hauteur publiée dans `--session-bar` : le Studio s'en sert pour tenir dans l'écran.
  useEffect(() => {
    const root = document.documentElement;
    const node = ref.current;
    if (!node) return;
    const observer = new ResizeObserver(() =>
      root.style.setProperty("--session-bar", `${node.offsetHeight}px`),
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      root.style.setProperty("--session-bar", "0px");
    };
  }, [session]);
  const openDialog = () => useUiStore.getState().setSessionDialogOpen(true);

  if (session === undefined) {
    return <div className="h-11 border-b-[0.5px] border-separator" aria-hidden="true" />;
  }

  return (
    <section
      ref={ref}
      aria-label="Session Live"
      className="sticky top-[calc(2.75rem+env(safe-area-inset-top))] z-20 flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 border-b-[0.5px] border-separator bg-surface px-4 py-1.5 sm:px-6 lg:top-[52px]"
    >
      {session ? (
        <>
          <p className="flex min-w-0 flex-1 items-center gap-2 text-xs">
            <span
              className="size-2 shrink-0 animate-on-air rounded-full bg-live"
              aria-hidden="true"
            />
            <span className="font-mono font-semibold tracking-wider text-live-text">
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
