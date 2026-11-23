"use client";

import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CtaPickerProps {
  suggestions: readonly string[];
  value?: string;
  onChange: (value: string | undefined) => void;
}

/** Appel à l'action : CTA fréquents du profil, ou saisie libre. */
export function CtaPicker({ suggestions, value, onChange }: CtaPickerProps) {
  return (
    <div className="flex flex-col gap-1.5">
      {suggestions.length > 0 ? (
        <div role="group" aria-label="CTA fréquents" className="flex flex-wrap gap-1.5">
          {suggestions.map((cta) => {
            const pressed = value === cta;
            return (
              <button
                key={cta}
                type="button"
                aria-pressed={pressed}
                onClick={() => onChange(pressed ? undefined : cta)}
                className={cn(
                  "max-w-full cursor-pointer truncate rounded-md border px-2 py-1 text-xs accent-transition",
                  pressed
                    ? "border-accent bg-accent text-accent-foreground"
                    : "border-border bg-elevated hover:bg-subtle",
                )}
              >
                {cta}
              </button>
            );
          })}
        </div>
      ) : null}
      <Input
        id="field-cta"
        aria-label="CTA"
        placeholder="Saisie libre (facultatif)"
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || undefined)}
      />
    </div>
  );
}
