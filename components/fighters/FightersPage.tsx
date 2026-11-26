"use client";

import { ArrowLeft, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useDirectoryData } from "@/hooks/useDirectoryData";
import { distinctValues, filterFighters, type FighterFilters } from "@/lib/fighters/query";
import { cn } from "@/lib/utils";
import { FighterDetail } from "./FighterDetail";
import { FighterList } from "./FighterList";
import { LargeTitle } from "@/components/layout/ScreenTitle";

type Selection = { kind: "fighter"; id: string } | { kind: "new" } | null;

/** Écran Combattants (section 15.1) : liste à gauche, fiche à droite. */
export function FightersPage() {
  const data = useDirectoryData();
  const [filters, setFilters] = useState<FighterFilters>({});
  const [selection, setSelection] = useState<Selection>(null);
  const fighters = useMemo(() => data?.fighters ?? [], [data]);
  const visible = useMemo(() => filterFighters(fighters, filters), [fighters, filters]);
  const selected =
    selection?.kind === "fighter" ? fighters.find((f) => f.id === selection.id) : undefined;
  const showDetail = selection?.kind === "new" || Boolean(selected);

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pt-3 pb-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <LargeTitle>Combattants</LargeTitle>
          <p className="max-w-2xl text-subheadline text-muted-foreground">
            Les fiches alimentent les formulaires du Studio et les faits autorisés des moteurs. Une
            fiche non mise à jour depuis 90 jours porte la mention « À vérifier ».
          </p>
        </div>
        <Button onClick={() => setSelection({ kind: "new" })}>
          <Plus aria-hidden="true" />
          Nouveau combattant
        </Button>
      </header>

      {!data ? (
        <p className="py-10 text-center text-13 text-muted-foreground">Chargement…</p>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <aside className={cn(showDetail && "hidden lg:block")} aria-label="Liste des combattants">
            <FighterList
              fighters={visible}
              total={fighters.length}
              filters={filters}
              onFilters={(patch) => setFilters((f) => ({ ...f, ...patch }))}
              weightClasses={distinctValues(fighters, "weightClass")}
              clubs={distinctValues(fighters, "club")}
              selectedId={selected?.id}
              onSelect={(id) => setSelection({ kind: "fighter", id })}
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
                <FighterDetail
                  key={selected?.id ?? "new"}
                  fighter={selected}
                  data={data}
                  onSaved={(f) => setSelection({ kind: "fighter", id: f.id })}
                  onDeleted={() => setSelection(null)}
                />
              </div>
            ) : (
              <p className="py-10 text-center text-13 text-muted-foreground">
                Choisissez un combattant dans la liste, ou créez une fiche.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
