import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { Slot } from "radix-ui";
import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

/**
 * Bouton iOS (section 5.5). `default` : remplissage d'accent, libellé blanc. `secondary` :
 * fond gris système, texte d'accent. `plain` : texte d'accent seul. `destructive` : rouge plein.
 * Cible tactile de 44 px sur écran tactile (`pointer-coarse`), quelle que soit la taille.
 */
export const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap select-none squircle accent-transition pointer-coarse:min-h-11 disabled:pointer-events-none disabled:opacity-40 aria-busy:cursor-progress [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-accent text-accent-foreground hover:brightness-110 active:brightness-90",
        secondary: "bg-fill text-accent-text hover:bg-fill/80 active:opacity-70",
        tinted:
          "bg-[color-mix(in_srgb,var(--accent)_14%,transparent)] text-accent-text hover:opacity-90 active:opacity-70",
        ghost: "text-foreground hover:bg-fill active:opacity-70",
        plain: "text-accent-text hover:opacity-80 active:opacity-60",
        destructive: "bg-danger-fill text-on-fill hover:brightness-110 active:brightness-90",
      },
      size: {
        sm: "h-8 px-3 text-13",
        default: "h-9 px-3.5 text-sm",
        touch: "h-11 px-4 text-[17px] lg:text-[15px]",
        lg: "h-[52px] w-full px-5 text-[17px]",
        icon: "size-9 pointer-coarse:min-w-11",
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
      {/* Le Slot exige un seul enfant : pas d'indicateur de chargement en `asChild`. */}
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : null}
          {children}
        </>
      )}
    </Component>
  );
}
