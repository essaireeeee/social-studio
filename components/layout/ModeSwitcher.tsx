"use client";

import { useRef, type KeyboardEvent } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { MODE_LABELS } from "@/lib/shell/mode";
import { cn } from "@/lib/utils";
import type { Mode } from "@/types/domain";

interface ModeSwitcherProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
}

const MODES: readonly Mode[] = ["live", "daily"];
const SHORTCUTS: Record<Mode, string> = { live: "Alt+L", daily: "Alt+D" };
const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]);

/**
 * Sélecteur de mode (section 12.2) : LIVE SHOW rouge avec pastille ON AIR, DAILY & MEDIA or.
 * Groupe radio : un seul arrêt de tabulation, les flèches changent le mode, comme des boutons
 * radio natifs. `Alt+L` / `Alt+D` partout dans l'application.
 */
export function ModeSwitcher({ mode, onChange }: ModeSwitcherProps) {
  const refs = useRef<Partial<Record<Mode, HTMLButtonElement | null>>>({});

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!NEXT_KEYS.has(event.key)) return;
    event.preventDefault();
    const next = mode === "live" ? "daily" : "live";
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label="Mode de travail"
      className="flex h-8 items-center rounded-md border border-border bg-elevated p-0.5"
    >
      {MODES.map((value) => {
        const active = value === mode;
        return (
          <Tooltip
            key={value}
            content={`${MODE_LABELS[value]} (${SHORTCUTS[value]})`}
            side="bottom"
          >
            <button
              ref={(node) => {
                refs.current[value] = node;
              }}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={MODE_LABELS[value]}
              aria-keyshortcuts={SHORTCUTS[value]}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(value)}
              onKeyDown={onKeyDown}
              className={cn(
                "flex h-7 cursor-pointer items-center gap-1.5 rounded-sm px-2.5 text-xs font-semibold tracking-wide whitespace-nowrap accent-transition sm:px-3",
                active
                  ? value === "live"
                    ? "bg-live text-white"
                    : "bg-daily text-background"
                  : "text-muted-foreground hover:bg-subtle hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full",
                  value === "live"
                    ? active
                      ? "animate-on-air bg-white"
                      : "bg-live"
                    : active
                      ? "bg-background"
                      : "bg-daily",
                )}
                aria-hidden="true"
              />
              <span className="hidden sm:inline" aria-hidden="true">
                {MODE_LABELS[value]}
              </span>
              <span className="sm:hidden" aria-hidden="true">
                {value === "live" ? "LIVE" : "DAILY"}
              </span>
              {value === "live" && active ? (
                <span
                  className="hidden rounded-xs bg-white/20 px-1 text-[10px] tracking-wider md:inline"
                  aria-hidden="true"
                >
                  ON AIR
                </span>
              ) : null}
            </button>
          </Tooltip>
        );
      })}
    </div>
  );
}
