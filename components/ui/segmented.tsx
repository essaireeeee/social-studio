"use client";

import { motion } from "motion/react";
import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { useReducedMotion } from "@/hooks/useMedia";
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
 * SegmentedControl iOS (section 5.5) : fond `--fill`, segment actif en surface claire
 * (jour) ou `--surface-3` (nuit) avec ombre légère, qui glisse d'un segment à l'autre.
 * Groupe radio (motif ARIA) : un seul arrêt de tabulation, les flèches changent la sélection,
 * Début et Fin vont aux extrémités.
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
  const group = useId();
  const reduced = useReducedMotion();
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
      className={cn(
        "grid w-full auto-cols-fr grid-flow-col rounded-[9px] bg-fill p-0.5 squircle",
        className,
      )}
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
              "relative flex min-w-0 cursor-pointer items-center justify-center gap-1.5 rounded-[7px] whitespace-nowrap",
              options.length >= 4 ? "px-1 text-xs" : "px-2 text-13",
              size === "touch" ? "h-10" : "h-7 pointer-coarse:h-10",
              checked
                ? "font-semibold text-foreground"
                : "font-medium text-muted-foreground hover:text-foreground",
            )}
          >
            {checked ? (
              <motion.span
                layoutId={`segment-${group}`}
                aria-hidden="true"
                transition={
                  reduced ? { duration: 0.1 } : { type: "spring", stiffness: 380, damping: 36 }
                }
                className="absolute inset-0 rounded-[7px] bg-surface shadow-[0_3px_8px_rgba(0,0,0,0.12),0_0_1px_rgba(0,0,0,0.04)] dark:bg-surface-3"
              />
            ) : null}
            <span className="relative z-10 flex min-w-0 items-center gap-1.5 truncate">
              {option.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Nom du composant dans la section 5.5. */
export const SegmentedControl = Segmented;
