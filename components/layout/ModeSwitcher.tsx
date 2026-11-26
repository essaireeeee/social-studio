"use client";

import { useRef, type KeyboardEvent } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { MODE_LABELS } from "@/lib/shell/mode";
import { cn } from "@/lib/utils";
import type { Mode } from "@/types/domain";

interface ModeSwitcherProps {
  mode: Mode;
  onChange: (mode: Mode) => void;
  /** Pleine largeur (sidebar, haut des écrans sur mobile). */
  block?: boolean;
  /** Sans la mention « ON AIR » (sidebar, trop étroite) : la pastille pulse toujours. */
  compact?: boolean;
  className?: string;
}

const MODES: readonly Mode[] = ["live", "daily"];
const SHORTCUTS: Record<Mode, string> = { live: "Alt+L", daily: "Alt+D" };
const NEXT_KEYS = new Set(["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"]);

/**
 * Sélecteur de mode, en contrôle segmenté iOS : LIVE SHOW rouge avec pastille ON AIR,
 * DAILY & MEDIA or ; le segment actif change de couleur en fondu (200 ms, section 5.6).
 * Groupe radio : un seul arrêt de tabulation, les flèches changent le mode, comme des boutons
 * radio natifs. `Alt+L` / `Alt+D` partout dans l'application.
 */
export function ModeSwitcher({
  mode,
  onChange,
  block = false,
  compact = false,
  className,
}: ModeSwitcherProps) {
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
      className={cn(
        "grid auto-cols-fr grid-flow-col rounded-[9px] bg-fill p-0.5 squircle",
        block ? "w-full" : "w-fit",
        className,
      )}
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
                "relative flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-[7px] px-3 text-xs font-semibold tracking-wide whitespace-nowrap pointer-coarse:h-10",
                "transition-colors duration-200",
                active
                  ? cn(
                      "text-white shadow-[0_3px_8px_rgba(0,0,0,0.12)]",
                      value === "live" ? "bg-live-fill" : "bg-daily-fill",
                    )
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "relative size-1.5 rounded-full",
                  active
                    ? value === "live"
                      ? "animate-on-air bg-white"
                      : "bg-white"
                    : value === "live"
                      ? "bg-live"
                      : "bg-daily",
                )}
                aria-hidden="true"
              />
              <span className="relative" aria-hidden="true">
                {MODE_LABELS[value]}
              </span>
              {value === "live" && active && !compact ? (
                <span
                  className="relative rounded-xs bg-black/30 px-1 text-[10px] tracking-wider"
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
