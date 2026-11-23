"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  /** Nom accessible si le libellé n'est pas du texte. */
  ariaLabel?: string;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
  label: string;
  size?: "default" | "touch";
  className?: string;
}

/**
 * Groupe radio segmenté (motif ARIA) : un seul arrêt de tabulation, les flèches changent
 * la sélection, Début et Fin vont aux extrémités.
 */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
  size = "default",
  className,
}: SegmentedProps<T>) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const last = options.length - 1;
    const moves: Record<string, number> = {
      ArrowRight: index === last ? 0 : index + 1,
      ArrowDown: index === last ? 0 : index + 1,
      ArrowLeft: index === 0 ? last : index - 1,
      ArrowUp: index === 0 ? last : index - 1,
      Home: 0,
      End: last,
    };
    const next = moves[event.key];
    if (next === undefined) return;
    event.preventDefault();
    onChange(options[next]!.value);
    refs.current[next]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex w-full rounded-md border border-border bg-elevated p-0.5", className)}
    >
      {options.map((option, i) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            ref={(node) => {
              refs.current[i] = node;
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={option.ariaLabel}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={onKeyDown}
            className={cn(
              "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-sm px-2 text-xs font-medium whitespace-nowrap accent-transition",
              size === "touch" ? "h-10" : "h-7",
              checked
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-subtle hover:text-foreground active:bg-subtle/70",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
