"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCategoriesByMode } from "@/lib/categories/registry";
import { eventLabelOf } from "@/lib/generation/native/context";
import { SOURCE_LABELS, STATUS_LABELS } from "@/lib/library/labels";
import type { LibraryFilters as Filters } from "@/lib/library/query";
import { PLATFORMS, PLATFORM_RULES } from "@/lib/platforms/rules";
import { MODE_LABELS } from "@/lib/shell/mode";
import { fighterName } from "@/lib/studio/fighter-search";
import { cn } from "@/lib/utils";
import type { Fighter, HexEvent, Mode, Platform, Source, Wording } from "@/types/domain";

const selectClass =
  "h-8 w-full rounded-md border border-input bg-background px-2 text-13 text-foreground";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex min-w-0 flex-col gap-1 text-xs text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

interface LibraryFiltersProps {
  filters: Filters;
  onChange: (patch: Partial<Filters>) => void;
  onReset: () => void;
  fighters: readonly Fighter[];
  events: readonly HexEvent[];
  tags: readonly string[];
  open: boolean;
}

/** Filtres de la bibliothèque (section 14.1). Toujours visibles à partir de 1 024 px. */
export function LibraryFilters({
  filters,
  onChange,
  onReset,
  fighters,
  events,
  tags,
  open,
}: LibraryFiltersProps) {
  const modes: Mode[] = filters.mode ? [filters.mode] : ["live", "daily"];
  const value = (v?: string) => v ?? "";
  const pick = <T extends string>(v: string) => (v ? (v as T) : undefined);

  return (
    <section
      id="library-filters"
      aria-label="Filtres"
      className={cn(
        "grid-cols-2 gap-3 rounded-lg border border-border bg-card p-3 sm:grid-cols-3 lg:grid lg:grid-cols-6",
        open ? "grid" : "hidden",
      )}
    >
      <Field label="Mode">
        <select
          className={selectClass}
          value={value(filters.mode)}
          onChange={(e) => onChange({ mode: pick<Mode>(e.target.value), categoryId: undefined })}
        >
          <option value="">Tous</option>
          <option value="live">{MODE_LABELS.live}</option>
          <option value="daily">{MODE_LABELS.daily}</option>
        </select>
      </Field>
      <Field label="Catégorie">
        <select
          className={selectClass}
          value={value(filters.categoryId)}
          onChange={(e) => onChange({ categoryId: pick(e.target.value) })}
        >
          <option value="">Toutes</option>
          {modes.map((mode) => (
            <optgroup key={mode} label={MODE_LABELS[mode]}>
              {getCategoriesByMode(mode).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </Field>
      <Field label="Combattant">
        <select
          className={selectClass}
          value={value(filters.fighterId)}
          onChange={(e) => onChange({ fighterId: pick(e.target.value) })}
        >
          <option value="">Tous</option>
          {fighters.map((f) => (
            <option key={f.id} value={f.id}>
              {fighterName(f)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Événement">
        <select
          className={selectClass}
          value={value(filters.eventId)}
          onChange={(e) => onChange({ eventId: pick(e.target.value) })}
        >
          <option value="">Tous</option>
          {events.map((ev) => (
            <option key={ev.id} value={ev.id}>
              {eventLabelOf(ev.name, ev.number)}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Du">
        <Input
          type="date"
          value={value(filters.dateFrom)}
          onChange={(e) => onChange({ dateFrom: pick(e.target.value) })}
        />
      </Field>
      <Field label="Au">
        <Input
          type="date"
          value={value(filters.dateTo)}
          onChange={(e) => onChange({ dateTo: pick(e.target.value) })}
        />
      </Field>
      <Field label="Plateforme">
        <select
          className={selectClass}
          value={value(filters.platform)}
          onChange={(e) => onChange({ platform: pick<Platform>(e.target.value) })}
        >
          <option value="">Toutes</option>
          {PLATFORMS.map((p) => (
            <option key={p} value={p}>
              {PLATFORM_RULES[p].label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Tag">
        <select
          className={selectClass}
          value={value(filters.tag)}
          onChange={(e) => onChange({ tag: pick(e.target.value) })}
          disabled={tags.length === 0}
        >
          <option value="">{tags.length === 0 ? "Aucun tag" : "Tous"}</option>
          {tags.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Statut">
        <select
          className={selectClass}
          value={value(filters.status)}
          onChange={(e) => onChange({ status: pick<Wording["status"]>(e.target.value) })}
        >
          <option value="">Tous</option>
          <option value="published">{STATUS_LABELS.published}</option>
          <option value="validated">{STATUS_LABELS.validated}</option>
        </select>
      </Field>
      <Field label="Source">
        <select
          className={selectClass}
          value={value(filters.source)}
          onChange={(e) => onChange({ source: pick<Source>(e.target.value) })}
        >
          <option value="">Toutes</option>
          {(Object.keys(SOURCE_LABELS) as Source[]).map((s) => (
            <option key={s} value={s}>
              {SOURCE_LABELS[s]}
            </option>
          ))}
        </select>
      </Field>
      <label className="flex items-center gap-2 self-end pb-1.5 text-xs text-muted-foreground sm:col-span-1 lg:col-span-1">
        <input
          type="checkbox"
          checked={Boolean(filters.includeDemo)}
          onChange={(e) => onChange({ includeDemo: e.target.checked })}
          className="size-4 accent-[var(--accent)]"
        />
        Inclure les exemples fictifs
      </label>
      <Button variant="ghost" size="sm" className="self-end" onClick={onReset}>
        Réinitialiser les filtres
      </Button>
    </section>
  );
}
