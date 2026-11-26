"use client";

import { Search, X } from "lucide-react";
import { useRef, useState, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

interface SearchFieldProps extends Omit<ComponentProps<"input">, "value" | "onChange" | "type"> {
  value: string;
  onValueChange: (value: string) => void;
  /** Nom accessible du champ. */
  label: string;
}

/**
 * Champ de recherche iOS (section 5.5) : arrondi, loupe, bouton d'effacement ; sur mobile,
 * « Annuler » apparaît au focus et vide le champ.
 */
export function SearchField({
  value,
  onValueChange,
  label,
  className,
  onFocus,
  onBlur,
  ...props
}: SearchFieldProps) {
  const [focused, setFocused] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <input
          ref={input}
          type="search"
          aria-label={label}
          value={value}
          onChange={(event) => onValueChange(event.target.value)}
          onFocus={(event) => {
            setFocused(true);
            onFocus?.(event);
          }}
          onBlur={(event) => {
            setFocused(false);
            onBlur?.(event);
          }}
          className="h-11 w-full rounded-md bg-fill pr-9 pl-8 text-field text-foreground squircle placeholder:text-muted-foreground focus-visible:outline-2 lg:h-9 [&::-webkit-search-cancel-button]:hidden"
          {...props}
        />
        {value ? (
          <button
            type="button"
            onClick={() => {
              onValueChange("");
              input.current?.focus();
            }}
            className="absolute top-1/2 right-1 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
            aria-label="Effacer la recherche"
          >
            <X className="size-4 rounded-full bg-label-3 p-0.5 text-surface" aria-hidden="true" />
          </button>
        ) : null}
      </div>
      {focused ? (
        <button
          type="button"
          // Garde le focus le temps du clic (sinon le bouton disparaît avant de recevoir l'action).
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => {
            onValueChange("");
            input.current?.blur();
          }}
          className="shrink-0 cursor-pointer text-body text-accent-text md:hidden"
        >
          Annuler
        </button>
      ) : null}
    </div>
  );
}
