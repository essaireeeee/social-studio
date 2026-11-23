import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Touche ou raccourci clavier affiché. */
export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 items-center rounded-sm border border-border bg-elevated px-1.5 font-mono text-[11px] text-muted-foreground",
        className,
      )}
      {...props}
    />
  );
}
