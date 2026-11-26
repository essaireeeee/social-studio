"use client";

import { useState } from "react";
import { Tooltip } from "@/components/ui/tooltip";
import { formatDateTime } from "@/lib/format";
import { ACTION_LABELS, ORIGIN_LABELS } from "@/lib/studio/revisions";
import { cn } from "@/lib/utils";
import type { Revision } from "@/types/domain";
import { DiffDialog } from "./DiffDialog";

interface RevisionTimelineProps {
  revisions: readonly Revision[];
  disabled?: boolean;
  onRestore: (revisionId: string) => void;
}

/** Versions v1, v2, v3… : revenir à l'une crée une nouvelle version, rien n'est perdu. */
export function RevisionTimeline({ revisions, disabled, onRestore }: RevisionTimelineProps) {
  const [diffOpen, setDiffOpen] = useState(false);
  const last = revisions.length - 1;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ol className="flex flex-wrap gap-1" aria-label="Versions">
        {revisions.map((r, i) => {
          const description = `${ORIGIN_LABELS[r.origin]}${r.action ? ` · ${ACTION_LABELS[r.action]}` : ""} · ${formatDateTime(r.createdAt)}`;
          const current = i === last;
          return (
            <li key={r.id}>
              <Tooltip
                content={
                  current
                    ? `${description} (version affichée)`
                    : `${description}. Cliquer pour y revenir.`
                }
                side="top"
              >
                <button
                  type="button"
                  disabled={current || disabled}
                  aria-current={current ? "true" : undefined}
                  aria-label={`Version ${i + 1} : ${description}${current ? ", affichée" : ", revenir à cette version"}`}
                  onClick={() => onRestore(r.id)}
                  className={cn(
                    "h-6 min-w-8 cursor-pointer rounded-full border px-2 text-[11px] font-medium tabular-nums accent-transition disabled:cursor-default",
                    current
                      ? "border-accent bg-accent text-accent-foreground"
                      : "border-border bg-elevated text-muted-foreground hover:bg-fill hover:text-foreground",
                    r.origin === "cm_edit" && !current && "border-dashed",
                  )}
                >
                  v{i + 1}
                </button>
              </Tooltip>
            </li>
          );
        })}
      </ol>
      {revisions.length > 1 ? (
        <button
          type="button"
          onClick={() => setDiffOpen(true)}
          className="cursor-pointer text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Voir les différences
        </button>
      ) : null}
      {diffOpen ? <DiffDialog open revisions={revisions} onOpenChange={setDiffOpen} /> : null}
    </div>
  );
}
