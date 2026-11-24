"use client";

import { ArrowUpRight, Check, GitCompare, Library, RotateCcw, Send } from "lucide-react";
import { useState } from "react";
import { DiffDialog } from "@/components/editor/DiffDialog";
import { LibraryDialog } from "@/components/editor/LibraryDialog";
import { PublishDialog } from "@/components/editor/PublishDialog";
import { VARIANT_LABELS } from "@/components/editor/VariantCard";
import { Button } from "@/components/ui/button";
import { SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { useRepository } from "@/hooks/useRepository";
import { useReopenInStudio } from "@/hooks/useReopenInStudio";
import { getCategory } from "@/lib/categories/registry";
import { formatDateTime } from "@/lib/format";
import { ENGINE_LABELS, finalTextOf, selectedVariant, statusActions } from "@/lib/history/history";
import { publish, reopen, validate } from "@/lib/studio/actions";
import { toast } from "@/stores/toast.store";
import type { Generation, HashtagGroup, Signature, Wording } from "@/types/domain";
import { BriefSummary } from "./BriefSummary";
import { GenerationStatusBadge } from "./GenerationStatusBadge";
import { RevisionHistory } from "./RevisionHistory";

interface HistoryDetailProps {
  generation: Generation;
  wordings: readonly Wording[];
  groups: readonly HashtagGroup[];
  signatures: readonly Signature[];
  today: string;
}

/** Détail d'une génération : brief, variantes et révisions, différences, références. */
export function HistoryDetail({
  generation,
  wordings,
  groups,
  signatures,
  today,
}: HistoryDetailProps) {
  const repository = useRepository();
  const reopenInStudio = useReopenInStudio();
  const [dialog, setDialog] = useState<"diff" | "library" | "publish" | null>(null);
  const variant = selectedVariant(generation);
  const references = generation.referenceIds
    .map((id) => wordings.find((w) => w.id === id))
    .filter((w): w is Wording => Boolean(w));
  const actions = statusActions(generation.status);

  const run = async (fn: () => Promise<unknown>, message: string) => {
    try {
      await fn();
      toast(message, "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Action impossible.", "danger");
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <SheetTitle>{getCategory(generation.brief.categoryId)?.label ?? "Génération"}</SheetTitle>
        <SheetDescription>
          Générée le {formatDateTime(generation.createdAt)} · moteur{" "}
          {ENGINE_LABELS[generation.engine]}
          {generation.fallbackReason ? " (bascule sur le moteur natif)" : ""}
        </SheetDescription>
        <div className="mt-1">
          <GenerationStatusBadge status={generation.status} />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={() => reopenInStudio(generation)}>
          <ArrowUpRight aria-hidden="true" />
          Rouvrir dans le Studio
        </Button>
        <Button size="sm" variant="secondary" onClick={() => setDialog("library")}>
          <Library aria-hidden="true" />
          Enregistrer dans la bibliothèque
        </Button>
        <Button size="sm" variant="secondary" disabled={!variant} onClick={() => setDialog("diff")}>
          <GitCompare aria-hidden="true" />
          Initial / final
        </Button>
        {repository && variant && actions.includes("validate") ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() =>
              void run(() => validate(repository, generation.id, variant.id), "Génération validée")
            }
          >
            <Check aria-hidden="true" />
            Valider
          </Button>
        ) : null}
        {repository && actions.includes("reopen") ? (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void run(() => reopen(repository, generation.id), "Validation retirée")}
          >
            <RotateCcw aria-hidden="true" />
            Retirer la validation
          </Button>
        ) : null}
        {actions.includes("publish") ? (
          <Button size="sm" variant="secondary" onClick={() => setDialog("publish")}>
            <Send aria-hidden="true" />
            Marquer comme publié
          </Button>
        ) : null}
      </div>
      {generation.status === "published" ? (
        <p className="text-xs text-muted-foreground">
          Publiée le {generation.publishedAt}
          {generation.publishedUrl ? ` · ${generation.publishedUrl}` : ""}
        </p>
      ) : null}

      <section aria-label="Brief initial" className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Brief initial
        </h3>
        <BriefSummary brief={generation.brief} groups={groups} signatures={signatures} />
      </section>

      <section aria-label="Variantes" className="flex flex-col gap-3">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Variantes et révisions
        </h3>
        {generation.variants.map((v) => (
          <RevisionHistory key={v.id} variant={v} label={VARIANT_LABELS[v.kind]} />
        ))}
      </section>

      <section aria-label="Références utilisées" className="flex flex-col gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          Références utilisées ({references.length})
        </h3>
        {references.length === 0 ? (
          <p className="text-13 text-muted-foreground">Aucune référence de la bibliothèque.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {references.map((w) => (
              <li key={w.id} className="line-clamp-2 rounded-md border border-border p-2 text-xs">
                {w.text}
              </li>
            ))}
          </ul>
        )}
      </section>

      {variant ? (
        <DiffDialog
          open={dialog === "diff"}
          revisions={variant.revisions}
          defaultFrom={0}
          onOpenChange={(open) => setDialog(open ? "diff" : null)}
        />
      ) : null}
      {dialog === "library" ? (
        <LibraryDialog
          generation={generation}
          text={finalTextOf(generation)}
          onClose={() => setDialog(null)}
        />
      ) : null}
      {dialog === "publish" && repository && variant ? (
        <PublishDialog
          today={today}
          onClose={() => setDialog(null)}
          onConfirm={(input) =>
            run(
              () => publish(repository, generation.id, variant.id, input),
              "Marquée comme publiée",
            )
          }
        />
      ) : null}
    </div>
  );
}
