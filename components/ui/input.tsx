import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/** Champ texte : 44 px et 17 px sur mobile (Safari ne zoome pas), 36 px sur desktop. */
export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-11 w-full min-w-0 rounded-md border border-input bg-surface px-3 text-field text-foreground accent-transition squircle placeholder:text-muted-foreground focus-visible:border-accent-text focus-visible:ring-3 focus-visible:ring-[color-mix(in_srgb,var(--accent)_25%,transparent)] focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger lg:h-9",
        className,
      )}
      {...props}
    />
  );
}
