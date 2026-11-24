import type { ReactNode } from "react";

export function DataBlock({ title, description, children }: { title: string; description: ReactNode; children: ReactNode }) {
  return (
    <section aria-label={title} className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-13 text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}
