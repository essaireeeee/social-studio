"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { getCategory } from "@/lib/categories/registry";
import { formatDate, formatScore } from "@/lib/format";
import { PLATFORM_RULES } from "@/lib/platforms/rules";
import type { ReferenceResult } from "@/lib/retrieval/retriever";
import { SCORE_COMPONENT_LABELS, type ScoreComponent } from "@/lib/retrieval/scorer";

interface ReferenceSheetProps {
  reference: ReferenceResult | null;
  excluded: boolean;
  onToggleExclude: (id: string) => void;
  onClose: () => void;
}

/** Publication complète d'une référence, avec le détail de son score. */
export function ReferenceSheet({
  reference,
  excluded,
  onToggleExclude,
  onClose,
}: ReferenceSheetProps) {
  const wording = reference?.wording;
  return (
    <Sheet open={reference !== null} onOpenChange={(open) => !open && onClose()}>
      {reference && wording ? (
        <SheetContent>
          <div className="flex flex-col gap-1">
            <SheetTitle>{getCategory(wording.categoryId)?.label ?? "Publication"}</SheetTitle>
            <SheetDescription>
              {wording.date
                ? `Publiée le ${formatDate(wording.date)}`
                : `Ajoutée le ${formatDate(wording.createdAt)}`}{" "}
              · {PLATFORM_RULES[wording.platform].label}
            </SheetDescription>
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge variant={wording.mode === "live" ? "live" : "daily"}>{reference.reason}</Badge>
            <Badge>Score {formatScore(reference.score)}</Badge>
            <Badge>Structure {reference.fingerprint || "-"}</Badge>
            {excluded ? <Badge variant="warning">Exclue de cette génération</Badge> : null}
          </div>

          <p className="rounded-md border border-border bg-background p-3 text-sm leading-relaxed whitespace-pre-wrap">
            {wording.text}
          </p>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Détail du score
            </h3>
            <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-13">
              {(Object.entries(reference.breakdown) as [ScoreComponent, number][])
                .filter(([, value]) => value !== 0)
                .map(([key, value]) => (
                  <div key={key} className="contents">
                    <dt className="text-muted-foreground">{SCORE_COMPONENT_LABELS[key]}</dt>
                    <dd className="text-right font-mono text-xs">
                      {value > 0 ? "+" : ""}
                      {formatScore(value)}
                    </dd>
                  </div>
                ))}
            </dl>
          </section>

          <Button
            variant={excluded ? "secondary" : "destructive"}
            className="mt-auto h-11 sm:h-8"
            onClick={() => onToggleExclude(wording.id)}
          >
            {excluded ? "Réintégrer à cette génération" : "Exclure de cette génération"}
          </Button>
        </SheetContent>
      ) : null}
    </Sheet>
  );
}
