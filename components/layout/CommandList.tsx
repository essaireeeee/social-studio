"use client";

import { Kbd } from "@/components/ui/kbd";
import type { PaletteEntry } from "@/lib/shell/commands";
import { cn } from "@/lib/utils";

interface CommandListProps {
  id: string;
  listId: string;
  entries: readonly PaletteEntry[];
  selected: number;
  query: string;
  onHover: (index: number) => void;
  onPick: (entry: PaletteEntry) => void;
}

/** Résultats de la palette, groupés ; l'option active suit le clavier (`aria-activedescendant`). */
export function CommandList({
  id,
  listId,
  entries,
  selected,
  query,
  onHover,
  onPick,
}: CommandListProps) {
  return (
    <ul
      id={listId}
      role="listbox"
      aria-label="Résultats"
      className="max-h-[50vh] overflow-y-auto p-1.5"
    >
      {entries.length === 0 ? (
        <li className="px-3 py-6 text-center text-13 text-muted-foreground" role="presentation">
          Aucun résultat pour « {query.trim()} ».
        </li>
      ) : null}
      {entries.map((entry, index) => (
        <li key={entry.key} role="presentation">
          {index === 0 || entries[index - 1]!.group !== entry.group ? (
            <p
              className="px-2.5 pt-2 pb-1 font-mono text-[10px] tracking-[0.18em] text-muted-foreground/70 uppercase"
              role="presentation"
            >
              {entry.group}
            </p>
          ) : null}
          <div
            id={`${id}-option-${index}`}
            role="option"
            aria-selected={index === selected}
            onMouseMove={() => onHover(index)}
            onClick={() => onPick(entry)}
            className={cn(
              "flex cursor-pointer items-center gap-3 rounded-md px-2.5 py-1.5 text-13",
              index === selected ? "bg-subtle text-foreground" : "text-muted-foreground",
            )}
          >
            <span className="min-w-0 flex-1 truncate">{entry.label}</span>
            {entry.hint ? (
              entry.group === "Actions" ? (
                <Kbd>{entry.hint}</Kbd>
              ) : (
                <span className="shrink-0 truncate text-xs text-muted-foreground">
                  {entry.hint}
                </span>
              )
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
