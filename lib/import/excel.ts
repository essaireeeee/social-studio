/**
 * Lecture d'un classeur Excel (.xlsx) : première feuille, première ligne = en-têtes.
 * `exceljs` est chargé à la demande, pour ne pas alourdir le reste de l'application.
 */
import type { Table } from "./table";

export async function parseExcel(data: ArrayBuffer): Promise<Table> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(data);
  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rows: [] };
  const rows: string[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values: string[] = [];
    for (let c = 1; c <= sheet.columnCount; c += 1) values.push(row.getCell(c).text ?? "");
    rows.push(values);
  });
  const [headers = [], ...body] = rows;
  return { headers: headers.map((h) => h.trim()), rows: body };
}
