import type { ReactNode } from "react";
import { formatDateTime, plural } from "@/lib/format";
import { cn } from "@/lib/utils";

interface StatBlockProps {
  title: string;
  corpusSize: number;
  analyzedAt: string;
  className?: string;
  children: ReactNode;
}

/** Bloc d'indicateurs : chaque bloc rappelle le volume analysé et la date d'analyse (section 8.8). */
export function StatBlock({ title, corpusSize, analyzedAt, className, children }: StatBlockProps) {
  return (
    <section
      className={cn("flex flex-col gap-3 rounded-lg border border-border bg-card p-4", className)}
    >
      <h3 className="text-13 font-semibold tracking-wide text-foreground uppercase">{title}</h3>
      <div className="flex flex-1 flex-col gap-3">{children}</div>
      <p className="text-xs text-muted-foreground">
        {plural(corpusSize, "publication analysée", "publications analysées")} ·{" "}
        {formatDateTime(analyzedAt)}
      </p>
    </section>
  );
}

export function StatNumber({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="font-mono text-xl font-semibold text-foreground tabular-nums">{value}</span>
      <span className="text-xs text-muted-foreground">{label}</span>
      {hint ? <span className="text-xs text-muted-foreground/80">{hint}</span> : null}
    </div>
  );
}

export function EmptyLine({ children }: { children: ReactNode }) {
  return <p className="text-13 text-muted-foreground">{children}</p>;
}
