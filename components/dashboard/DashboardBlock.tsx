import Link from "next/link";
import type { ReactNode } from "react";

/** Bloc compact du dashboard, avec un lien vers l'écran complet. */
export function DashboardBlock({
  title,
  href,
  linkLabel,
  children,
}: {
  title: string;
  href?: string;
  linkLabel?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className="flex min-w-0 flex-col gap-3 rounded-lg border border-border bg-card p-4"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {title}
        </h2>
        {href ? (
          <Link
            href={href}
            className="text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {linkLabel ?? "Tout voir"}
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
