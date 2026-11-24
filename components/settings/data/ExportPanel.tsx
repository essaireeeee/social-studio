"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRepository } from "@/hooks/useRepository";
import { snapshotWorkbook } from "@/lib/data/excel-export";
import { exportFileName, libraryCsv, snapshotJson } from "@/lib/data/export";
import { toast } from "@/stores/toast.store";
import { DataBlock } from "./DataBlock";
import { downloadFile } from "./download";

type Kind = "json" | "csv" | "xlsx";

/** Exports : JSON intégral, CSV de la bibliothèque, Excel (section 16.3). */
export function ExportPanel() {
  const repository = useRepository();
  const [busy, setBusy] = useState<Kind | null>(null);

  const run = async (kind: Kind) => {
    if (!repository) return;
    setBusy(kind);
    try {
      const now = new Date();
      const snapshot = await repository.exportAll();
      if (kind === "json") {
        downloadFile(exportFileName("sauvegarde", "json", now), snapshotJson(snapshot), "application/json");
      } else if (kind === "csv") {
        const csv = libraryCsv(snapshot.tables.wordings, snapshot.tables);
        downloadFile(exportFileName("bibliotheque", "csv", now), csv, "text/csv;charset=utf-8");
      } else {
        downloadFile(
          exportFileName("donnees", "xlsx", now),
          await snapshotWorkbook(snapshot),
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        );
      }
      toast("Export téléchargé", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Export impossible.", "danger", {
        label: "Réessayer",
        onClick: () => void run(kind),
      });
    } finally {
      setBusy(null);
    }
  };

  return (
    <DataBlock
      title="Exporter"
      description="Le JSON contient toutes les tables et la version du schéma, jamais de clé API. Le CSV contient la bibliothèque sans les exemples fictifs, avec les colonnes de l'import CSV."
    >
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" loading={busy === "json"} onClick={() => void run("json")}>
          <Download aria-hidden="true" />
          Export JSON intégral
        </Button>
        <Button variant="secondary" loading={busy === "csv"} onClick={() => void run("csv")}>
          <Download aria-hidden="true" />
          Bibliothèque en CSV
        </Button>
        <Button variant="secondary" loading={busy === "xlsx"} onClick={() => void run("xlsx")}>
          <Download aria-hidden="true" />
          Excel (une feuille par table)
        </Button>
      </div>
    </DataBlock>
  );
}
