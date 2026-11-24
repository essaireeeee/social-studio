"use client";

import { MODE_LABELS } from "@/lib/shell/mode";
import type { Mode } from "@/types/domain";

/** Cases LIVE SHOW / DAILY & MEDIA. */
export function ModeChecks({
  value,
  onChange,
  error,
}: {
  value: Mode[];
  onChange: (modes: Mode[]) => void;
  error?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="text-xs text-muted-foreground">Modes</legend>
      <div className="flex flex-wrap gap-4">
        {(["live", "daily"] as const).map((mode) => (
          <label key={mode} className="flex items-center gap-2 text-13">
            <input
              type="checkbox"
              checked={value.includes(mode)}
              onChange={(e) =>
                onChange(e.target.checked ? [...value, mode] : value.filter((m) => m !== mode))
              }
              className="size-4 accent-[var(--accent)]"
            />
            {MODE_LABELS[mode]}
          </label>
        ))}
      </div>
      {error ? <p className="text-xs text-danger">{error}</p> : null}
    </fieldset>
  );
}
