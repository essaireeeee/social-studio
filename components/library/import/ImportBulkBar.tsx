"use client";

import { getCategoriesByMode } from "@/lib/categories/registry";
import type { BulkPatch } from "@/lib/import/rows";
import { PLATFORMS, PLATFORM_RULES } from "@/lib/platforms/rules";
import { MODE_LABELS } from "@/lib/shell/mode";
import type { Mode, Platform } from "@/types/domain";

const selectClass = "h-8 rounded-md border border-input bg-background px-2 text-13 text-foreground";

interface ImportBulkBarProps {
  selected: number;
  total: number;
  onApply: (patch: BulkPatch) => void;
  onSelectAll: (selected: boolean) => void;
}

/** Actions groupées sur les lignes cochées : mode, catégorie, plateforme. */
export function ImportBulkBar({ selected, total, onApply, onSelectAll }: ImportBulkBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-elevated p-2 text-xs">
      <span className="font-medium" aria-live="polite">
        {selected} / {total} cochée{selected > 1 ? "s" : ""}
      </span>
      <button
        type="button"
        className="cursor-pointer text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        onClick={() => onSelectAll(selected < total)}
      >
        {selected < total ? "Tout cocher" : "Tout décocher"}
      </button>
      <span className="text-muted-foreground">Appliquer à la sélection :</span>
      <select
        aria-label="Appliquer un mode à la sélection"
        className={selectClass}
        value=""
        disabled={selected === 0}
        onChange={(e) => e.target.value && onApply({ mode: e.target.value as Mode })}
      >
        <option value="">Mode…</option>
        <option value="live">{MODE_LABELS.live}</option>
        <option value="daily">{MODE_LABELS.daily}</option>
      </select>
      <select
        aria-label="Appliquer une catégorie à la sélection"
        className={selectClass}
        value=""
        disabled={selected === 0}
        onChange={(e) => e.target.value && onApply({ categoryId: e.target.value })}
      >
        <option value="">Catégorie…</option>
        {(["live", "daily"] as const).map((mode) => (
          <optgroup key={mode} label={MODE_LABELS[mode]}>
            {getCategoriesByMode(mode).map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
      <select
        aria-label="Appliquer une plateforme à la sélection"
        className={selectClass}
        value=""
        disabled={selected === 0}
        onChange={(e) => e.target.value && onApply({ platform: e.target.value as Platform })}
      >
        <option value="">Plateforme…</option>
        {PLATFORMS.map((p) => (
          <option key={p} value={p}>
            {PLATFORM_RULES[p].label}
          </option>
        ))}
      </select>
    </div>
  );
}
