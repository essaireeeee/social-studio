/** Lecture d'un fichier CSV (séparateur détecté, BOM retiré, lignes vides ignorées). */
import Papa from "papaparse";
import type { Table } from "./table";

const BOM = new RegExp("^\\uFEFF");

export function parseCsv(text: string): Table {
  const result = Papa.parse<string[]>(text.replace(BOM, ""), {
    skipEmptyLines: "greedy",
  });
  const [headers = [], ...rows] = result.data;
  return { headers: headers.map((h) => h.trim()), rows };
}
