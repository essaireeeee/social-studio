"use client";

import { Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  /** Nom accessible (« Round », « Jours avant l'événement »…). */
  label: string;
  className?: string;
}

const half =
  "flex h-8 w-11 cursor-pointer items-center justify-center text-foreground accent-transition hover:bg-fill active:bg-fill disabled:cursor-not-allowed disabled:opacity-30 pointer-coarse:h-11";

/** Stepper iOS (−/+) pour rounds, nombres de jours, minutes. La valeur est annoncée. */
export function Stepper({
  value,
  onChange,
  min = -Infinity,
  max = Infinity,
  step = 1,
  label,
  className,
}: StepperProps) {
  const set = (next: number) => onChange(Math.min(max, Math.max(min, next)));
  return (
    <div className={cn("inline-flex items-center gap-3", className)}>
      <output
        aria-live="polite"
        className="min-w-8 text-right text-body tabular-nums"
        aria-label={label}
      >
        {value}
      </output>
      <div
        className="inline-flex overflow-hidden rounded-md bg-fill squircle"
        role="group"
        aria-label={label}
      >
        <button
          type="button"
          className={half}
          onClick={() => set(value - step)}
          disabled={value <= min}
          aria-label={`Diminuer : ${label}`}
        >
          <Minus className="size-4" aria-hidden="true" />
        </button>
        <span aria-hidden="true" className="my-1.5 w-px bg-separator" />
        <button
          type="button"
          className={half}
          onClick={() => set(value + step)}
          disabled={value >= max}
          aria-label={`Augmenter : ${label}`}
        >
          <Plus className="size-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
