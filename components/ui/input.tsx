import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-8 w-full min-w-0 rounded-md border border-input bg-background px-2.5 text-13 text-foreground accent-transition placeholder:text-muted-foreground hover:border-muted-foreground/40 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger",
        className,
      )}
      {...props}
    />
  );
}
