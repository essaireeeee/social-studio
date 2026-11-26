import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ICON_COLORS, type IconColor } from "@/lib/design/icon-colors";
import { cn } from "@/lib/utils";

/**
 * Listes groupées en encart (« inset grouped », section 5.5) : en-tête de section en
 * Footnote majuscule, cellules sur une surface arrondie, séparateurs fins décalés à gauche
 * jusqu'au texte, pied de section explicatif.
 */
export function GroupedSection({
  header,
  footer,
  children,
  className,
  id,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  const headingId = id ? `${id}-titre` : undefined;
  return (
    <section
      className={cn("flex flex-col gap-1.5", className)}
      aria-labelledby={header ? headingId : undefined}
    >
      {header ? (
        <h2
          id={headingId}
          className="px-4 text-footnote tracking-wide text-muted-foreground uppercase"
        >
          {header}
        </h2>
      ) : null}
      <ul className="overflow-hidden rounded-xl bg-surface squircle">{children}</ul>
      {footer ? <div className="px-4 text-footnote text-muted-foreground">{footer}</div> : null}
    </section>
  );
}

export interface CellProps {
  title: ReactNode;
  subtitle?: ReactNode;
  /** Valeur affichée à droite (« Automatique », « 3 »…). */
  value?: ReactNode;
  icon?: LucideIcon;
  iconColor?: IconColor;
  href?: string;
  onClick?: () => void;
  /** Contrôle à droite (interrupteur, stepper) : la cellule n'est alors pas cliquable. */
  accessory?: ReactNode;
  disabled?: boolean;
  /** Mention à droite d'une cellule désactivée (« Bientôt disponible »). */
  disabledNote?: string;
  destructive?: boolean;
  /** Identifiant du titre, pour relier un contrôle (`aria-labelledby`). */
  titleId?: string;
  className?: string;
}

const separator =
  "before:pointer-events-none before:absolute before:top-0 before:right-0 before:h-px before:origin-top before:scale-y-50 before:bg-separator first:before:hidden";

/** Cellule : icône facultative dans un carré coloré de 29 px, titre, sous-titre, valeur, chevron. */
export function Cell({
  title,
  subtitle,
  value,
  icon: Icon,
  iconColor = "gray",
  href,
  onClick,
  accessory,
  disabled,
  disabledNote,
  destructive,
  titleId,
  className,
}: CellProps) {
  const interactive = !disabled && !accessory && (href || onClick);
  const body = (
    <>
      {Icon ? (
        <span
          className="flex size-[29px] shrink-0 items-center justify-center rounded-[7px] text-white squircle"
          style={{ backgroundColor: ICON_COLORS[iconColor] }}
          aria-hidden="true"
        >
          <Icon className="size-[18px]" strokeWidth={2} />
        </span>
      ) : null}
      <span className="flex min-w-0 flex-1 flex-col py-0.5">
        <span
          id={titleId}
          className={cn("truncate text-body", destructive ? "text-danger" : "text-foreground")}
        >
          {title}
        </span>
        {subtitle ? (
          <span className="truncate text-subheadline text-muted-foreground">{subtitle}</span>
        ) : null}
      </span>
      {value !== undefined ? (
        <span className="shrink-0 text-body text-muted-foreground">{value}</span>
      ) : null}
      {disabled && disabledNote ? (
        <span className="shrink-0 text-footnote text-muted-foreground">{disabledNote}</span>
      ) : null}
      {accessory}
      {interactive && href ? (
        <ChevronRight className="size-4 shrink-0 text-label-3" aria-hidden="true" />
      ) : null}
    </>
  );
  const row = cn(
    "flex min-h-11 w-full items-center gap-3 px-4 py-2 text-left",
    interactive &&
      "cursor-pointer accent-transition hover:bg-fill/60 active:bg-fill focus-visible:-outline-offset-2",
    disabled && "cursor-not-allowed opacity-50",
  );
  const inset = Icon ? "before:left-[57px]" : "before:left-4";

  return (
    <li className={cn("relative", separator, inset, className)}>
      {interactive && href ? (
        <Link href={href} className={row}>
          {body}
        </Link>
      ) : interactive ? (
        <button type="button" onClick={onClick} className={row}>
          {body}
        </button>
      ) : (
        <div className={row} aria-disabled={disabled || undefined}>
          {body}
        </div>
      )}
    </li>
  );
}
