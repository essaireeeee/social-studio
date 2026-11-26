import { ChevronsUpDown } from "lucide-react";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Picker : liste native (`<select>`), qui ouvre la roue iOS sur iPhone. Pour une heure,
 * `TimeField` (`input type="time"`, roue native sur mobile).
 */
export function Picker({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <span className={cn("relative inline-flex w-full", className)}>
      <select
        className="h-11 w-full cursor-pointer appearance-none rounded-md border border-input bg-surface pr-9 pl-3 text-field text-foreground accent-transition squircle disabled:cursor-not-allowed disabled:opacity-50 lg:h-9"
        {...props}
      >
        {children}
      </select>
      <ChevronsUpDown
        className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
    </span>
  );
}

export function TimeField({ className, ...props }: Omit<ComponentProps<"input">, "type">) {
  return (
    <input
      type="time"
      className={cn(
        "h-11 rounded-md border border-input bg-surface px-3 text-field text-foreground tabular-nums squircle lg:h-9",
        className,
      )}
      {...props}
    />
  );
}
