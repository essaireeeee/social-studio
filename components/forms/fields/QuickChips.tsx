"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface QuickChipsProps {
  id: string;
  label: string;
  options: readonly string[];
  value: string | string[] | undefined;
  multiple?: boolean;
  /** « Autre » ouvre une saisie libre. */
  allowCustom?: boolean;
  describedBy?: string;
  onChange: (value: string | string[] | undefined) => void;
}

/**
 * Puces de choix rapide (section 13.3) : un clic sélectionne, un second désélectionne.
 * Flèches gauche et droite pour passer d'une puce à l'autre.
 */
export function QuickChips({
  id,
  label,
  options,
  value,
  multiple = false,
  allowCustom = false,
  describedBy,
  onChange,
}: QuickChipsProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = Array.isArray(value) ? value : value ? [value] : [];
  const custom = allowCustom && !multiple && value && !options.includes(value as string);
  const [otherOpen, setOtherOpen] = useState(Boolean(custom));

  const toggle = (option: string) => {
    if (allowCustom && option === "Autre") {
      setOtherOpen(!otherOpen);
      if (otherOpen) onChange(undefined);
      return;
    }
    setOtherOpen(false);
    if (multiple) {
      const next = selected.includes(option)
        ? selected.filter((o) => o !== option)
        : [...selected, option];
      onChange(next.length > 0 ? next : undefined);
    } else {
      onChange(selected.includes(option) ? undefined : option);
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (!delta) return;
    event.preventDefault();
    refs.current[(index + delta + options.length) % options.length]?.focus();
  };

  return (
    <div className="flex flex-col gap-2">
      <div
        role="group"
        aria-label={label}
        aria-describedby={describedBy}
        className="flex flex-wrap gap-1.5"
      >
        {options.map((option, index) => {
          const pressed = option === "Autre" ? otherOpen : selected.includes(option);
          return (
            <button
              key={option}
              id={index === 0 ? id : undefined}
              ref={(node) => {
                refs.current[index] = node;
              }}
              type="button"
              aria-pressed={pressed}
              onClick={() => toggle(option)}
              onKeyDown={(event) => onKeyDown(event, index)}
              className={cn(
                "h-8 cursor-pointer rounded-md border px-2.5 text-xs font-medium accent-transition",
                pressed
                  ? "border-accent bg-accent text-accent-foreground"
                  : "border-transparent bg-fill text-foreground hover:bg-fill/70 active:opacity-70",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      {otherOpen ? (
        <Input
          aria-label={`${label} : autre`}
          placeholder="Préciser"
          value={custom ? (value as string) : ""}
          onChange={(event) => onChange(event.target.value || undefined)}
          autoFocus
        />
      ) : null}
    </div>
  );
}
