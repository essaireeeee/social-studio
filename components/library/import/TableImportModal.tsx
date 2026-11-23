"use client";

import { Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { LibraryData } from "@/hooks/useLibraryData";
import { parseCsv } from "@/lib/import/csv";
import { parseExcel } from "@/lib/import/excel";
import {
  CSV_TEMPLATE,
  needsMapping,
  recordsFromTable,
  suggestMapping,
  type ColumnMapping,
  type ImportRecord,
  type Table,
} from "@/lib/import/table";
import { ColumnMappingStep } from "./ColumnMappingStep";
import { ImportDialog } from "./ImportDialog";
import { ImportReviewFlow } from "./ImportReviewFlow";

const STEPS = ["Fichier", "Correspondance", "Vérifier", "Confirmer"];

function downloadTemplate() {
  const bom = String.fromCodePoint(0xfeff);
  const url = URL.createObjectURL(
    new Blob([bom, CSV_TEMPLATE], { type: "text/csv;charset=utf-8" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "modele-bibliotheque-hexagone.csv";
  link.click();
  URL.revokeObjectURL(url);
}

/** Import CSV ou Excel (section 14.4), puis étapes Vérifier et Confirmer. */
export function TableImportModal({ data, onClose }: { data: LibraryData; onClose: () => void }) {
  const [table, setTable] = useState<Table | null>(null);
  const [source, setSource] = useState<"csv" | "excel">("csv");
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [mappingNeeded, setMappingNeeded] = useState(false);
  const [records, setRecords] = useState<ImportRecord[] | null>(null);
  const [step, setStep] = useState<"review" | "confirm">("review");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);

  const toRecords = (t: Table, m: ColumnMapping) => {
    const found = recordsFromTable(t, m);
    if (found.length === 0) {
      setError("Aucune ligne avec un texte n'a été trouvée dans la colonne choisie.");
      return;
    }
    setError(undefined);
    setStep("review");
    setRecords(found);
  };

  const read = async (file: File) => {
    setBusy(true);
    setError(undefined);
    try {
      const name = file.name.toLowerCase();
      const excel = name.endsWith(".xlsx");
      if (!excel && !name.endsWith(".csv")) {
        throw new Error("Format non pris en charge : choisissez un fichier .csv ou .xlsx.");
      }
      const parsed = excel
        ? await parseExcel(await file.arrayBuffer())
        : parseCsv(await file.text());
      if (parsed.rows.length === 0)
        throw new Error("Le fichier ne contient aucune ligne de données.");
      const suggested = suggestMapping(parsed.headers);
      setSource(excel ? "excel" : "csv");
      setTable(parsed);
      setMapping(suggested);
      const needed = needsMapping(parsed.headers, suggested);
      setMappingNeeded(needed);
      if (!needed) toRecords(parsed, suggested);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lecture du fichier impossible.");
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setTable(null);
    setRecords(null);
    setError(undefined);
  };
  const current = records ? (step === "review" ? 2 : 3) : table && mappingNeeded ? 1 : 0;

  return (
    <ImportDialog
      title="Importer un fichier CSV ou Excel"
      description="Colonnes reconnues sans tenir compte de la casse ni des accents : texte (requis), mode, catégorie, combattants (séparés par ;), événement, date, réseau, lien, hashtags, cta, tags, commentaire."
      steps={STEPS}
      current={current}
      onClose={onClose}
    >
      {records ? (
        <ImportReviewFlow
          records={records}
          source={source}
          data={data}
          step={step}
          onStep={setStep}
          onBack={() => (mappingNeeded ? setRecords(null) : reset())}
          onDone={onClose}
        />
      ) : table && mappingNeeded ? (
        <ColumnMappingStep
          table={table}
          mapping={mapping}
          onChange={setMapping}
          onBack={reset}
          onContinue={() => toRecords(table, mapping)}
        />
      ) : (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Fichier .csv ou .xlsx (première feuille)
            <input
              type="file"
              accept=".csv,.xlsx,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              disabled={busy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void read(file);
              }}
              className="text-13 text-foreground file:mr-3 file:h-8 file:cursor-pointer file:rounded-md file:border file:border-border file:bg-elevated file:px-3 file:text-13 file:text-foreground"
            />
          </label>
          <Button variant="ghost" size="sm" className="self-start" onClick={downloadTemplate}>
            <Download aria-hidden="true" />
            Télécharger le modèle CSV
          </Button>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-13 text-danger">
          {error}
        </p>
      ) : null}
    </ImportDialog>
  );
}
