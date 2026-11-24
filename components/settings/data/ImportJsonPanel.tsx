"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { useRepository } from "@/hooks/useRepository";
import { getDataServices } from "@/lib/database/client";
import type { ImportStrategy } from "@/lib/database/repository";
import { readSnapshotText, type SnapshotPreview } from "@/lib/data/import-json";
import { formatDateTime } from "@/lib/format";
import { toast } from "@/stores/toast.store";
import { CountsTable } from "./CountsTable";
import { DataBlock } from "./DataBlock";
import { backupBeforeReplace } from "./download";
import { StepConfirm } from "./StepConfirm";

const REPLACE_STEPS = [
  {
    title: "Remplacer toutes les données ?",
    description: "Toutes les données actuelles seront remplacées par celles du fichier.",
    confirmLabel: "Continuer",
  },
  {
    title: "Dernière confirmation",
    description:
      "Une sauvegarde de l'état actuel est faite automatiquement (dossier data/backups, ou téléchargement). Ensuite, les données sont remplacées.",
    confirmLabel: "Remplacer les données",
  },
];

/** Import d'un export JSON : aperçu, « Fusionner » par défaut, « Remplacer » confirmé deux fois. */
export function ImportJsonPanel() {
  const repository = useRepository();
  const [preview, setPreview] = useState<SnapshotPreview | null>(null);
  const [strategy, setStrategy] = useState<ImportStrategy>("merge");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const run = async () => {
    if (!repository || !preview?.ok) return;
    setBusy(true);
    try {
      const services = getDataServices();
      const report = await repository.importAll(preview.snapshot, strategy, {
        backup: backupBeforeReplace(services),
      });
      const added = Object.values(report.added).reduce((a, b) => a + b, 0);
      const skipped = Object.values(report.skipped).reduce((a, b) => a + b, 0);
      toast(
        strategy === "replace"
          ? `Données remplacées (${added} éléments)`
          : `Import terminé : ${added} ajoutés, ${skipped} doublons ignorés`,
        "success",
      );
      setPreview(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Import impossible.", "danger", {
        label: "Réessayer",
        onClick: () => void run(),
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <DataBlock
      title="Importer un export JSON"
      description="Fusionner ajoute ce qui manque et ignore les doublons. Remplacer efface tout, après une sauvegarde automatique."
    >
      <label className="flex flex-col gap-1 text-xs text-muted-foreground">
        Fichier JSON exporté par le Social Studio
        <input
          type="file"
          accept=".json,application/json"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (file) setPreview(readSnapshotText(await file.text()));
            e.target.value = "";
          }}
          className="text-13 text-foreground file:mr-3 file:h-8 file:cursor-pointer file:rounded-md file:border file:border-border file:bg-elevated file:px-3 file:text-13 file:text-foreground"
        />
      </label>
      {preview && !preview.ok ? (
        <p role="alert" className="text-13 text-danger">{preview.error}</p>
      ) : null}
      {preview?.ok ? (
        <div className="flex flex-col gap-3">
          <CountsTable counts={preview.counts} caption={`Contenu du fichier (export du ${formatDateTime(preview.exportedAt)})`} />
          <Segmented<ImportStrategy>
            label="Stratégie d'import"
            className="max-w-sm"
            value={strategy}
            onChange={setStrategy}
            options={[
              { value: "merge", label: "Fusionner" },
              { value: "replace", label: "Remplacer" },
            ]}
          />
          <Button
            className="self-start"
            variant={strategy === "replace" ? "destructive" : "default"}
            loading={busy}
            onClick={() => (strategy === "replace" ? setConfirming(true) : void run())}
          >
            {strategy === "replace" ? "Remplacer les données…" : "Fusionner avec les données actuelles"}
          </Button>
        </div>
      ) : null}
      <StepConfirm steps={REPLACE_STEPS} open={confirming} onConfirm={() => void run()} onClose={() => setConfirming(false)} />
    </DataBlock>
  );
}
