"use client";

import { Button } from "@/components/ui/button";
import {
  COLUMN_LABELS,
  IMPORT_COLUMNS,
  type ColumnMapping,
  type ImportColumn,
  type Table,
} from "@/lib/import/table";

interface ColumnMappingStepProps {
  table: Table;
  mapping: ColumnMapping;
  onChange: (mapping: ColumnMapping) => void;
  onBack: () => void;
  onContinue: () => void;
}

/** Correspondance des colonnes quand les en-têtes du fichier ne sont pas tous reconnus. */
export function ColumnMappingStep({
  table,
  mapping,
  onChange,
  onBack,
  onContinue,
}: ColumnMappingStepProps) {
  const sample = table.rows[0] ?? [];
  const set = (column: ImportColumn, value: string) => {
    const next = { ...mapping };
    if (value === "") delete next[column];
    else next[column] = Number(value);
    onChange(next);
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-13 text-muted-foreground">
        Certains en-têtes ne sont pas reconnus. Indiquez quelle colonne du fichier correspond à
        chaque champ. Seul le texte est requis.
      </p>
      <div className="grid gap-x-4 gap-y-2 sm:grid-cols-2">
        {IMPORT_COLUMNS.map((column) => {
          const index = mapping[column];
          return (
            <label key={column} className="flex flex-col gap-1 text-xs text-muted-foreground">
              {COLUMN_LABELS[column]}
              <select
                value={index === undefined ? "" : String(index)}
                onChange={(e) => set(column, e.target.value)}
                className="h-8 rounded-md border border-input bg-background px-2 text-13 text-foreground"
              >
                <option value="">Ignorer</option>
                {table.headers.map((header, i) => (
                  <option key={`${header}-${i}`} value={i}>
                    {header || `Colonne ${i + 1}`}
                  </option>
                ))}
              </select>
              {index !== undefined && sample[index] ? (
                <span className="truncate">Exemple : {sample[index]}</span>
              ) : null}
            </label>
          );
        })}
      </div>
      <div className="flex justify-between gap-2">
        <Button variant="secondary" onClick={onBack}>
          Choisir un autre fichier
        </Button>
        <Button disabled={mapping.texte === undefined} onClick={onContinue}>
          Continuer
        </Button>
      </div>
    </div>
  );
}
