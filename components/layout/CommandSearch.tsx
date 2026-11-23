"use client";

import { Search } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Kbd } from "@/components/ui/kbd";
import { useLiveSession } from "@/hooks/useLiveSession";
import { useRepository } from "@/hooks/useRepository";
import { useSidebar } from "@/hooks/useSidebar";
import {
  EMPTY_FOUND,
  actionCommands,
  filterActions,
  paletteEntries,
  type PaletteEntry,
  type PaletteFound,
} from "@/lib/shell/commands";
import { inputFromEvent } from "@/lib/shell/live-session";
import { navItem } from "@/lib/shell/navigation";
import { useUiStore } from "@/stores/ui.store";
import type { Mode } from "@/types/domain";
import { CommandList } from "./CommandList";
import { RecordSheet, type SheetRecord } from "./RecordSheet";

const MIN_QUERY = 2;
const PER_GROUP = 5;

interface CommandSearchProps {
  mode: Mode;
  onModeChange: (mode: Mode) => void;
}

/** Palette `Cmd/Ctrl+K` (section 12.2) : actions, wordings, combattants, événements. */
export function CommandSearch({ mode, onModeChange }: CommandSearchProps) {
  const id = useId();
  const router = useRouter();
  const repository = useRepository();
  const session = useLiveSession();
  const { collapsed, toggle } = useSidebar();
  const open = useUiStore((state) => state.commandOpen);
  const setOpen = useUiStore((state) => state.setCommandOpen);
  const [query, setQuery] = useState("");
  const [found, setFound] = useState<PaletteFound>(EMPTY_FOUND);
  const [active, setActive] = useState(0);
  const [sheet, setSheet] = useState<SheetRecord | null>(null);

  useEffect(() => {
    let current = true;
    const term = query.trim();
    if (!repository || term.length < MIN_QUERY) {
      Promise.resolve().then(() => current && setFound(EMPTY_FOUND));
    } else {
      Promise.all([
        repository.wordings.search(term, PER_GROUP),
        repository.fighters.search(term, PER_GROUP),
        repository.events.search(term, PER_GROUP),
      ]).then(([wordings, fighters, events]) => {
        if (current) setFound({ wordings, fighters, events });
      });
    }
    return () => {
      current = false;
    };
  }, [query, repository]);

  const entries = useMemo(
    () =>
      paletteEntries(
        filterActions(
          actionCommands({ mode, hasActiveSession: Boolean(session), sidebarCollapsed: collapsed }),
          query,
        ),
        found,
      ),
    [mode, session, collapsed, query, found],
  );

  const selected = Math.min(active, Math.max(0, entries.length - 1));

  useEffect(() => {
    document.getElementById(`${id}-option-${selected}`)?.scrollIntoView({ block: "nearest" });
  }, [id, selected]);

  const close = () => {
    setOpen(false);
    setQuery("");
    setActive(0);
  };

  const run = (entry: PaletteEntry) => {
    close();
    if (entry.group !== "Actions") {
      setSheet(entry.record);
      return;
    }
    const ui = useUiStore.getState();
    if (entry.action === "mode-live") onModeChange("live");
    else if (entry.action === "mode-daily") onModeChange("daily");
    else if (entry.action === "session-start" || entry.action === "session-edit")
      ui.setSessionDialogOpen(true);
    else if (entry.action === "session-end") ui.setEndSessionOpen(true);
    else if (entry.action === "sidebar-toggle") toggle();
    else if (entry.action.startsWith("nav:")) {
      const item = navItem(entry.action.slice(4));
      if (item) router.push(item.href);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (entries.length === 0) return;
    const moves: Record<string, number> = {
      ArrowDown: (selected + 1) % entries.length,
      ArrowUp: (selected - 1 + entries.length) % entries.length,
      Home: 0,
      End: entries.length - 1,
    };
    if (event.key in moves) {
      event.preventDefault();
      setActive(moves[event.key]!);
    } else if (event.key === "Enter") {
      event.preventDefault();
      run(entries[selected]!);
    }
  };

  const listId = `${id}-list`;
  return (
    <>
      <Dialog open={open} onOpenChange={(next) => (next ? setOpen(true) : close())}>
        <DialogContent hideClose className="gap-0 p-0" aria-describedby={undefined}>
          <DialogTitle className="sr-only">Rechercher ou lancer une action</DialogTitle>
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 text-muted-foreground" aria-hidden="true" />
            <input
              autoFocus
              role="combobox"
              aria-expanded="true"
              aria-controls={listId}
              aria-activedescendant={entries.length > 0 ? `${id}-option-${selected}` : undefined}
              aria-autocomplete="list"
              aria-label="Rechercher : actions, wordings, combattants, événements"
              placeholder="Rechercher une action, un wording, un combattant, un événement…"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              className="h-11 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
            <Kbd>Échap</Kbd>
          </div>
          <CommandList
            id={id}
            listId={listId}
            entries={entries}
            selected={selected}
            query={query}
            onHover={setActive}
            onPick={run}
          />
          {query.trim().length < MIN_QUERY ? (
            <p className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
              Saisissez au moins {MIN_QUERY} caractères pour chercher dans les wordings, les
              combattants et les événements.
            </p>
          ) : null}
        </DialogContent>
      </Dialog>
      <RecordSheet
        item={sheet}
        onClose={() => setSheet(null)}
        onStartSession={
          session === null
            ? (event) => {
                setSheet(null);
                onModeChange("live");
                useUiStore.getState().setSessionDialogOpen(true, inputFromEvent(event));
              }
            : undefined
        }
      />
    </>
  );
}
