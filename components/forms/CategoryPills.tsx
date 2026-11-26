"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import {
  CATEGORY_GROUPS,
  getCategoriesByMode,
  getCategory,
  type CategoryDef,
} from "@/lib/categories/registry";
import { normalizeText } from "@/lib/editorial/text-utils";
import { cn } from "@/lib/utils";
import type { Mode } from "@/types/domain";

interface CategoryPillsProps {
  mode: Mode;
  value?: string;
  error?: string;
  onSelect: (categoryId: string) => void;
}

function Pill({
  category,
  selected,
  live,
  first,
  onSelect,
}: {
  category: CategoryDef;
  selected: boolean;
  live: boolean;
  first: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      data-category-pill={first ? "" : undefined}
      aria-keyshortcuts={live ? category.shortcut : undefined}
      onClick={onSelect}
      className={cn(
        "relative flex min-h-11 cursor-pointer items-center gap-1.5 py-1.5 text-left accent-transition squircle lg:min-h-10",
        live
          ? "rounded-xl pr-5 pl-2.5 text-[11px] leading-tight font-semibold uppercase"
          : "rounded-full px-3 text-13",
        selected
          ? "bg-accent text-accent-foreground"
          : "bg-fill text-foreground hover:bg-fill/70 active:opacity-70",
      )}
    >
      <span aria-hidden="true" className="shrink-0">
        {category.emoji}
      </span>
      <span className="min-w-0 flex-1 [overflow-wrap:anywhere] hyphens-auto">{category.label}</span>
      {live && category.shortcut ? (
        <Kbd
          className={cn(
            "absolute top-1 right-1 h-4 px-1 text-[10px]",
            selected && "border-white/30 bg-white/15 text-inherit",
          )}
        >
          {category.shortcut}
        </Kbd>
      ) : null}
    </button>
  );
}

/**
 * Catégories (section 13.3). LIVE : grille de 12, raccourcis 1 à 9, 0, -, =.
 * DAILY : quatre groupes repliables et un filtre.
 */
export function CategoryPills({ mode, value, error, onSelect }: CategoryPillsProps) {
  const categories = getCategoriesByMode(mode);
  const current = getCategory(value ?? "");
  const [filter, setFilter] = useState("");
  const [openGroups, setOpenGroups] = useState<Set<string>>(
    () => new Set(current?.group ? [current.group] : ["sport"]),
  );

  if (mode === "live") {
    return (
      <div className="flex flex-col gap-1.5">
        <div
          role="group"
          aria-label="Catégorie"
          className="grid grid-cols-2 gap-1.5 2xl:grid-cols-3"
        >
          {categories.map((category, index) => (
            <Pill
              key={category.id}
              category={category}
              selected={category.id === value}
              live
              first={index === 0}
              onSelect={() => onSelect(category.id)}
            />
          ))}
        </div>
        {error ? <p className="text-xs text-danger">{error}</p> : null}
      </div>
    );
  }

  const needle = normalizeText(filter);
  const matches = (c: CategoryDef) => !needle || normalizeText(c.label).includes(needle);
  const toggle = (group: string) =>
    setOpenGroups((open) => {
      const next = new Set(open);
      if (next.has(group)) next.delete(group);
      else next.add(group);
      return next;
    });

  return (
    <div className="flex flex-col gap-2">
      <Input
        aria-label="Rechercher une catégorie"
        placeholder="Rechercher une catégorie"
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
      />
      {CATEGORY_GROUPS.map((group, groupIndex) => {
        const items = categories.filter((c) => c.group === group.id && matches(c));
        if (items.length === 0) return null;
        const open = Boolean(needle) || openGroups.has(group.id);
        const panelId = `category-group-${group.id}`;
        return (
          <div key={group.id} className="rounded-md border border-border">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={panelId}
              onClick={() => toggle(group.id)}
              className="flex w-full cursor-pointer items-center justify-between px-3 py-2 text-footnote font-semibold tracking-wide text-muted-foreground hover:text-foreground"
            >
              {group.label}
              <ChevronDown
                className={cn("size-3.5 transition-transform", open && "rotate-180")}
                aria-hidden="true"
              />
            </button>
            {open ? (
              <div
                id={panelId}
                role="group"
                aria-label={group.label}
                className="grid grid-cols-2 gap-1.5 px-2 pb-2"
              >
                {items.map((category, index) => (
                  <Pill
                    key={category.id}
                    category={category}
                    selected={category.id === value}
                    live={false}
                    first={groupIndex === 0 && index === 0}
                    onSelect={() => onSelect(category.id)}
                  />
                ))}
              </div>
            ) : null}
          </div>
        );
      })}
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
