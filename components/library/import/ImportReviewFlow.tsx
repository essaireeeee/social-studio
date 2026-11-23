"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { LibraryData } from "@/hooks/useLibraryData";
import { useRepository } from "@/hooks/useRepository";
import { createClassifier } from "@/lib/import/classifier";
import { commitImport } from "@/lib/import/commit";
import {
  applyToSelected,
  buildRows,
  mergeRows,
  splitRow,
  summarize,
  updateRow,
  withReplace,
  type ImportRow,
  type RowContext,
} from "@/lib/import/rows";
import type { ImportRecord } from "@/lib/import/table";
import { dedupeItems } from "@/lib/library/actions";
import { plural } from "@/lib/format";
import { toast } from "@/stores/toast.store";
import type { Source } from "@/types/domain";
import { ImportBulkBar } from "./ImportBulkBar";
import { ImportConfirm } from "./ImportConfirm";
import { ImportReviewTable } from "./ImportReviewTable";

function contextOf(data: LibraryData): RowContext {
  return {
    classify: createClassifier(
      data.wordings.map((w) => ({
        id: w.id,
        text: w.text,
        categoryId: w.categoryId,
        isDemo: w.isDemo,
      })),
    ),
    library: dedupeItems(data.wordings),
  };
}

interface ImportReviewFlowProps {
  records: readonly ImportRecord[];
  source: Source;
  data: LibraryData;
  /** Étape affichée : vérification ou confirmation. */
  step: "review" | "confirm";
  onStep: (step: "review" | "confirm") => void;
  onBack: () => void;
  onDone: () => void;
}

/** Étapes « Vérifier » et « Confirmer », communes à tous les imports (section 14.3). */
export function ImportReviewFlow({
  records,
  source,
  data,
  step,
  onStep,
  onBack,
  onDone,
}: ImportReviewFlowProps) {
  const repository = useRepository();
  // Contexte figé à l'ouverture : la bibliothèque peut changer pendant l'import.
  const [ctx] = useState(() => contextOf(data));
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [replace, setReplace] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void buildRows(records, ctx).then((built) => {
      if (!cancelled) setRows(built);
    });
    return () => {
      cancelled = true;
    };
  }, [records, ctx]);

  if (!rows) {
    return (
      <p className="py-8 text-center text-13 text-muted-foreground">Analyse des publications…</p>
    );
  }

  const run = async (next: Promise<ImportRow[]>) => setRows(await next);
  const summary = summarize(rows, replace);
  const libraryDuplicates = rows.filter(
    (r) => r.duplicate.kind === "exact" && !r.duplicate.inBatch,
  ).length;

  const importRows = async () => {
    if (!repository) return;
    setBusy(true);
    try {
      const result = await commitImport(repository, rows, { source, replace });
      const done = result.created + result.replaced;
      toast(
        `${plural(done, "publication importée", "publications importées")}${
          result.profilesRecomputed > 0
            ? " · profil de style recalculé, à valider dans ADN éditorial"
            : ""
        }`,
        "success",
      );
      onDone();
    } catch (error) {
      toast(error instanceof Error ? error.message : "Import impossible.", "danger");
    } finally {
      setBusy(false);
    }
  };

  if (step === "confirm") {
    return (
      <ImportConfirm
        summary={summary}
        libraryDuplicates={libraryDuplicates}
        replace={replace}
        onReplace={(value) => {
          setReplace(value);
          setRows(withReplace(rows, value));
        }}
        busy={busy}
        onBack={() => onStep("review")}
        onImport={() => void importRows()}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-13 text-muted-foreground" aria-live="polite">
        {plural(rows.length, "publication détectée", "publications détectées")} ·{" "}
        {plural(rows.filter((r) => r.duplicate.kind !== "new").length, "doublon", "doublons")} ·{" "}
        {plural(rows.filter((r) => !r.categoryId).length, "à catégoriser", "à catégoriser")}
      </p>
      <ImportBulkBar
        selected={rows.filter((r) => r.selected).length}
        total={rows.length}
        onApply={(patch) => setRows(applyToSelected(rows, patch))}
        onSelectAll={(selected) =>
          setRows(
            rows.map((r) =>
              r.duplicate.kind === "exact" && r.duplicate.inBatch ? r : { ...r, selected },
            ),
          )
        }
      />
      <ImportReviewTable
        rows={rows}
        wordings={data.wordings}
        onPatch={(key, patch) => setRows(updateRow(rows, key, patch))}
        onMerge={(key, nextKey) => void run(mergeRows(rows, key, nextKey, ctx))}
        onSplit={(key) => void run(splitRow(rows, key, ctx))}
      />
      <div className="flex justify-between gap-2">
        <Button variant="secondary" onClick={onBack}>
          Retour
        </Button>
        <Button onClick={() => onStep("confirm")}>
          Continuer : {plural(summary.toImport, "publication")} à importer
        </Button>
      </div>
    </div>
  );
}
