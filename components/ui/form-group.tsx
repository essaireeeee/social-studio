import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Groupe de réglages façon Réglages iOS : en-tête en Footnote majuscule hors de la carte,
 * contenu sur une surface arrondie, pied explicatif. Pour les formulaires ; les listes de
 * liens utilisent `GroupedSection`.
 */
export function FormGroup({
  title,
  footer,
  children,
  className,
}: {
  title: string;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section aria-label={title} className="flex flex-col gap-1.5">
      <h2 className="px-4 text-footnote tracking-wide text-muted-foreground uppercase">{title}</h2>
      <div className={cn("flex flex-col gap-4 rounded-xl bg-surface p-4 squircle", className)}>
        {children}
      </div>
      {footer ? <div className="px-4 text-footnote text-muted-foreground">{footer}</div> : null}
    </section>
  );
}

/** Ligne de réglage avec interrupteur : libellé, aide, contrôle à droite. */
export function SwitchRow({
  id,
  label,
  hint,
  control,
}: {
  id: string;
  label: string;
  hint?: string;
  control: ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col">
        <span id={id} className="text-body text-foreground">
          {label}
        </span>
        {hint ? <span className="text-footnote text-muted-foreground">{hint}</span> : null}
      </div>
      {control}
    </div>
  );
}
