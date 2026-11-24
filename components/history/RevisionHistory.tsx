import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/format";
import { ACTION_LABELS, ORIGIN_LABELS } from "@/lib/studio/revisions";
import type { Variant } from "@/types/domain";

/** Toutes les révisions d'une variante, avec leur origine : moteur ou CM. */
export function RevisionHistory({ variant, label }: { variant: Variant; label: string }) {
  return (
    <section aria-label={label} className="flex flex-col gap-2 rounded-md border border-border p-3">
      <h4 className="flex items-center gap-2 text-13 font-medium">
        {label}
        {variant.selected ? <Badge variant="success">Retenue</Badge> : null}
      </h4>
      <ol className="flex flex-col gap-2">
        {variant.revisions.map((revision, i) => (
          <li key={revision.id} className="flex flex-col gap-1">
            <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>v{i + 1}</span>
              <Badge variant={revision.origin === "cm_edit" ? "warning" : "neutral"}>
                {revision.origin === "cm_edit" ? "CM" : "Moteur"} · {ORIGIN_LABELS[revision.origin]}
              </Badge>
              {revision.action ? <span>{ACTION_LABELS[revision.action]}</span> : null}
              <span>{formatDateTime(revision.createdAt)}</span>
            </p>
            <p className="rounded-md bg-background p-2 text-13 whitespace-pre-wrap">
              {revision.text}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
