"use client";

import { ChevronDown } from "lucide-react";
import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCategory } from "@/lib/categories/registry";
import { formatDate, formatScore, plural } from "@/lib/format";
import type { ReferenceResult } from "@/lib/retrieval/retriever";
import { cn } from "@/lib/utils";
import type { Mode } from "@/types/domain";
import { ReferenceSheet } from "./ReferenceSheet";

interface ReferencesPanelProps {
  mode: Mode;
  references: readonly ReferenceResult[];
  excludedIds: readonly string[];
  onToggleExclude: (id: string) => void;
  onRegenerate: () => void;
  regenerating?: boolean;
  defaultOpen?: boolean;
}

const MODE_LABELS: Record<Mode, string> = { live: "LIVE SHOW", daily: "DAILY & MEDIA" };

/** Panneau « RÉFÉRENCES UTILISÉES » de la colonne Wording Studio (section 9.3). */
export function ReferencesPanel({
  mode,
  references,
  excludedIds,
  onToggleExclude,
  onRegenerate,
  regenerating = false,
  defaultOpen = false,
}: ReferencesPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const contentId = useId();
  const excluded = new Set(excludedIds);
  const excludedCount = references.filter((r) => excluded.has(r.wording.id)).length;
  const selected = references.find((r) => r.wording.id === selectedId) ?? null;

  return (
    <section className="rounded-lg border border-border bg-card">
      <button
        type="button"
        className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-4 py-3 text-left hover:bg-subtle"
        aria-expanded={open}
        aria-controls={contentId}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="text-xs font-semibold tracking-wide uppercase">
          Références utilisées ({references.length})
        </span>
        <ChevronDown
          className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <div id={contentId} className="flex flex-col gap-3 border-t border-border p-3">
          {references.length === 0 ? (
            <p className="px-1 text-13 text-muted-foreground">
              Aucune référence : la bibliothèque ne contient pas encore de publication{" "}
              {MODE_LABELS[mode]} réelle proche de ce brief. Les propositions s&apos;appuient sur
              les modèles par défaut.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {references.map((reference) => {
                const { wording } = reference;
                const isExcluded = excluded.has(wording.id);
                return (
                  <li key={wording.id}>
                    <button
                      type="button"
                      className={cn(
                        "flex w-full cursor-pointer flex-col gap-1.5 rounded-md p-2 text-left hover:bg-subtle",
                        isExcluded && "opacity-50",
                      )}
                      onClick={() => setSelectedId(wording.id)}
                      aria-label={`Voir la référence : ${wording.text.slice(0, 60)}`}
                    >
                      <span
                        className={cn(
                          "line-clamp-2 text-13 text-foreground",
                          isExcluded && "line-through",
                        )}
                      >
                        {wording.text}
                      </span>
                      <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <span>{getCategory(wording.categoryId)?.label ?? "À catégoriser"}</span>
                        <span aria-hidden="true">·</span>
                        <span>{formatDate(wording.date ?? wording.createdAt)}</span>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono">{formatScore(reference.score)}</span>
                        <Badge variant={mode === "live" ? "live" : "daily"}>
                          {reference.reason}
                        </Badge>
                        {isExcluded ? <Badge variant="warning">Exclue</Badge> : null}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {excludedCount > 0 ? (
            <div className="flex flex-col gap-2 border-t border-border px-1 pt-3 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-13 text-muted-foreground">
                {plural(excludedCount, "référence exclue", "références exclues")} de cette
                génération.
              </span>
              <Button onClick={onRegenerate} loading={regenerating} className="h-11 sm:h-8">
                Régénérer
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      <ReferenceSheet
        reference={selected}
        excluded={selected ? excluded.has(selected.wording.id) : false}
        onToggleExclude={onToggleExclude}
        onClose={() => setSelectedId(null)}
      />
    </section>
  );
}
