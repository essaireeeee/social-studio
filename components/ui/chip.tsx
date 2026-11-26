import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Pilule de sélection (section 5.5). Pleine et en accent quand elle est choisie.
 * `size="touch"` : 44 px de haut (catégories LIVE sur mobile).
 */
export function chipClass({
  selected,
  size = "default",
}: {
  selected: boolean;
  size?: "default" | "touch";
}) {
  return cn(
    "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-3.5 font-medium whitespace-nowrap squircle accent-transition disabled:cursor-not-allowed disabled:opacity-40",
    size === "touch" ? "h-11 text-[15px]" : "h-8 text-13 pointer-coarse:h-11",
    selected
      ? "bg-accent text-accent-foreground"
      : "bg-fill text-foreground hover:bg-[color-mix(in_srgb,var(--fill)_100%,var(--label)_6%)] active:opacity-70",
  );
}

export function Chip({
  selected = false,
  size,
  className,
  ...props
}: ComponentProps<"button"> & { selected?: boolean; size?: "default" | "touch" }) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(chipClass({ selected, size }), className)}
      {...props}
    />
  );
}
