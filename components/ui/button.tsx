import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Bouton (shadcn/ui adapté). `default` utilise l'accent du mode actif.
 * Focus : anneau `--accent` global (globals.css). États : hover, active, disabled, loading.
 */
export const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap select-none accent-transition disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground hover:bg-accent/90 active:bg-accent/80",
        secondary:
          "border border-border bg-elevated text-foreground hover:bg-subtle active:bg-subtle/70",
        ghost: "text-foreground hover:bg-subtle active:bg-subtle/70",
        destructive: "bg-danger text-white hover:bg-danger/90 active:bg-danger/80",
      },
      size: {
        sm: "h-7 px-2.5 text-xs",
        default: "h-8 px-3 text-13",
        touch: "h-11 px-4 text-sm",
        icon: "size-8",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

export interface ButtonProps extends ComponentProps<"button">, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  /** Affiche un indicateur de chargement et désactive le bouton. */
  loading?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot.Root : "button";
  return (
    <Component
      data-slot="button"
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading && !asChild ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
      {children}
    </Component>
  );
}
