"use client";

import { ArrowLeft, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDirectoryData } from "@/hooks/useDirectoryData";
import { useNow } from "@/hooks/useNow";
import { eventTimeline } from "@/lib/events/query";
import { cn } from "@/lib/utils";
import { EventDetail } from "./EventDetail";
import { EventList } from "./EventList";
import { LargeTitle } from "@/components/layout/ScreenTitle";

type Selection = { kind: "event"; id: string } | { kind: "new" } | null;

/** Écran Événements (section 15.2) : liste chronologique à gauche, fiche à droite. */
export function EventsPage() {
  const data = useDirectoryData();
  const now = useNow(60_000);
  const [selection, setSelection] = useState<Selection>(null);
  const today = now ? now.toISOString().slice(0, 10) : "";
  const events = useMemo(() => data?.events ?? [], [data]);
  const timeline = useMemo(() => eventTimeline(events, today), [events, today]);
  const selected =
    selection?.kind === "event" ? events.find((e) => e.id === selection.id) : undefined;
  const showDetail = selection?.kind === "new" || Boolean(selected);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-3 pb-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <LargeTitle>Événements</LargeTitle>
          <p className="max-w-2xl text-subheadline text-muted-foreground">
            Date, lieu, diffusion et fight card alimentent les formulaires du Studio, les signatures
            et la Session Live. Sans « Horaires confirmés », aucun horaire n&apos;est publié.
          </p>
        </div>
        <Button onClick={() => setSelection({ kind: "new" })}>
          <Plus aria-hidden="true" />
          Nouvel événement
        </Button>
      </header>
      {!data ? (
        <p className="py-10 text-center text-13 text-muted-foreground">Chargement…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <aside className={cn(showDetail && "hidden lg:block")} aria-label="Liste des événements">
            <EventList
              timeline={timeline}
              selectedId={selected?.id}
              onSelect={(id) => setSelection({ kind: "event", id })}
            />
          </aside>
          <section
            aria-label="Fiche"
            className={cn(
              "min-w-0 rounded-xl bg-card p-4 squircle sm:p-5",
              !showDetail && "hidden lg:block",
            )}
          >
            {showDetail ? (
              <div className="flex flex-col gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  className="self-start lg:hidden"
                  onClick={() => setSelection(null)}
                >
                  <ArrowLeft aria-hidden="true" />
                  Retour à la liste
                </Button>
                <EventDetail
                  key={selected?.id ?? "new"}
                  event={selected}
                  data={data}
                  onSaved={(e) => setSelection({ kind: "event", id: e.id })}
                  onDeleted={() => setSelection(null)}
                />
              </div>
            ) : (
              <p className="py-10 text-center text-13 text-muted-foreground">
                Choisissez un événement, ou créez-en un.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
