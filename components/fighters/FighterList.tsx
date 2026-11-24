"use client";

import { Search } from "lucide-react";
import { UpdatedNote } from "@/components/directory/UpdatedNote";
import { Input } from "@/components/ui/input";
import type { FighterFilters } from "@/lib/fighters/query";
import { cn } from "@/lib/utils";
import type { Fighter } from "@/types/domain";

const selectClass =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-13 text-foreground";

interface FighterListProps {
  fighters: readonly Fighter[];
  total: number;
  filters: FighterFilters;
  onFilters: (patch: Partial<FighterFilters>) => void;
  weightClasses: readonly string[];
  clubs: readonly string[];
  selectedId?: string;
  onSelect: (id: string) => void;
}

/** Liste filtrable par nom, catégorie de poids et club (section 15.1). */
export function FighterList(props: FighterListProps) {
  const { fighters, filters, onFilters } = props;
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Rechercher
        <span className="relative">
          <Search
            className="pointer-events-none absolute top-2 left-2.5 size-4"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={filters.text ?? ""}
            onChange={(e) => onFilters({ text: e.target.value })}
            placeholder="Nom, surnom ou club"
            className="pl-8"
          />
        </span>
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Catégorie de poids
          <select
            className={selectClass}
            value={filters.weightClass ?? ""}
            onChange={(e) => onFilters({ weightClass: e.target.value || undefined })}
          >
            <option value="">Toutes</option>
            {props.weightClasses.map((w) => (
              <option key={w}>{w}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Club
          <select
            className={selectClass}
            value={filters.club ?? ""}
            onChange={(e) => onFilters({ club: e.target.value || undefined })}
          >
            <option value="">Tous</option>
            {props.clubs.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        {fighters.length} sur {props.total}
      </p>
      {fighters.length === 0 ? (
        <p className="rounded-md border border-dashed border-border p-4 text-center text-13 text-muted-foreground">
          {props.total === 0 ? "Aucune fiche pour l'instant." : "Aucun combattant ne correspond."}
        </p>
      ) : (
        <ul className="flex flex-col gap-1" aria-label="Combattants">
          {fighters.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                aria-current={f.id === props.selectedId ? "true" : undefined}
                onClick={() => props.onSelect(f.id)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-left",
                  f.id === props.selectedId
                    ? "border-accent bg-accent/10"
                    : "border-transparent hover:bg-subtle",
                )}
              >
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-13 font-medium">
                    {f.firstName} {f.lastName}
                    {f.nickname ? (
                      <span className="font-normal text-muted-foreground"> « {f.nickname} »</span>
                    ) : null}
                  </span>
                  <span className="truncate text-xs text-muted-foreground">
                    {[f.weightClass, f.club].filter(Boolean).join(" · ") || "Fiche à compléter"}
                  </span>
                </span>
                <UpdatedNote at={f.updatedAt} compact />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
