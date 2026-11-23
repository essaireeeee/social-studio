"use client";

import {
  Camera,
  FileSpreadsheet,
  LayoutGrid,
  List,
  ClipboardPaste,
  Plus,
  Search,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { SORT_LABELS, type LibrarySort } from "@/lib/library/query";
import type { LibraryView } from "@/stores/library.store";

export type ImportKind = "bulk" | "table" | "instagram";

interface LibraryToolbarProps {
  text: string;
  onText: (text: string) => void;
  sort: LibrarySort;
  onSort: (sort: LibrarySort) => void;
  view: LibraryView;
  onView: (view: LibraryView) => void;
  activeFilters: number;
  filtersOpen: boolean;
  onToggleFilters: () => void;
  onAdd: () => void;
  onImport: (kind: ImportKind) => void;
}

const itemClass =
  "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-subtle [&_svg]:size-4 [&_svg]:text-muted-foreground";

/** Recherche, tri, vue, ajout et imports. */
export function LibraryToolbar(props: LibraryToolbarProps) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
      <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground">
        Rechercher
        <span className="relative">
          <Search
            className="pointer-events-none absolute top-2 left-2.5 size-4 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={props.text}
            onChange={(e) => props.onText(e.target.value)}
            placeholder="Mots-clés, ou « expression exacte » entre guillemets"
            className="pl-8"
          />
        </span>
      </label>
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Trier par
          <select
            value={props.sort}
            onChange={(e) => props.onSort(e.target.value as LibrarySort)}
            className="h-8 rounded-md border border-input bg-background px-2 text-13 text-foreground"
          >
            {(Object.keys(SORT_LABELS) as LibrarySort[]).map((s) => (
              <option key={s} value={s}>
                {SORT_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
        <Segmented
          label="Affichage"
          className="w-auto"
          value={props.view}
          onChange={props.onView}
          options={[
            {
              value: "list",
              label: <List className="size-4" aria-hidden="true" />,
              ariaLabel: "Liste",
            },
            {
              value: "grid",
              label: <LayoutGrid className="size-4" aria-hidden="true" />,
              ariaLabel: "Grille",
            },
          ]}
        />
        <Button
          variant="secondary"
          className="lg:hidden"
          aria-expanded={props.filtersOpen}
          aria-controls="library-filters"
          onClick={props.onToggleFilters}
        >
          <SlidersHorizontal aria-hidden="true" />
          Filtres{props.activeFilters > 0 ? ` (${props.activeFilters})` : ""}
        </Button>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <Button variant="secondary">
              <Upload aria-hidden="true" />
              Importer
            </Button>
          </DropdownMenu.Trigger>
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              align="end"
              className="z-50 min-w-60 rounded-md border border-border bg-elevated p-1 text-13 shadow-lg"
            >
              <DropdownMenu.Item className={itemClass} onSelect={() => props.onImport("bulk")}>
                <ClipboardPaste aria-hidden="true" />
                Coller plusieurs publications
              </DropdownMenu.Item>
              <DropdownMenu.Item className={itemClass} onSelect={() => props.onImport("table")}>
                <FileSpreadsheet aria-hidden="true" />
                Fichier CSV ou Excel
              </DropdownMenu.Item>
              <DropdownMenu.Item className={itemClass} onSelect={() => props.onImport("instagram")}>
                <Camera aria-hidden="true" />
                Publication ou export Instagram
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        </DropdownMenu.Root>
        <Button onClick={props.onAdd}>
          <Plus aria-hidden="true" />
          Ajouter
        </Button>
      </div>
    </div>
  );
}
