/**
 * Export Excel (section 16.3) : une feuille par table, plus une feuille « Réglages ».
 * Les objets imbriqués sont écrits en JSON ; les images (blobs) ne sont pas recopiées
 * (une cellule Excel est limitée à 32 767 caractères), seule leur taille est indiquée.
 */
import { TABLE_NAMES, type Snapshot, type TableName } from "@/lib/database/snapshot";

export const SHEET_NAMES: Record<TableName, string> = {
  wordings: "Bibliothèque",
  fighters: "Combattants",
  events: "Événements",
  liveSessions: "Sessions Live",
  generations: "Générations",
  hashtagGroups: "Hashtags",
  signatures: "Signatures",
  rules: "Règles",
  styleProfiles: "Profils de style",
  users: "Utilisateurs",
  blobs: "Images",
  calendarItems: "Calendrier",
  reminders: "Rappels",
  campaigns: "Campagnes",
  suggestions: "Idées",
  frenchRules: "Règles de français",
  frenchDictionary: "Dictionnaire",
  frenchIssues: "Alertes de français",
  newsSources: "Sources d'actualité",
  newsItems: "Articles",
  engagement: "Engagement",
};

const MAX_CELL = 32_767;

export function cellValue(value: unknown): string | number | boolean {
  if (value === undefined || value === null) return "";
  if (typeof value === "number" || typeof value === "boolean") return value;
  const text = typeof value === "string" ? value : JSON.stringify(value);
  return text.length > MAX_CELL ? `${text.slice(0, MAX_CELL - 20)}… (tronqué)` : text;
}

/** Lignes d'une table : en-têtes = union des champs, dans l'ordre d'apparition. */
export function tableRows(
  name: TableName,
  records: readonly Record<string, unknown>[],
): { headers: string[]; rows: (string | number | boolean)[][] } {
  const headers: string[] = [];
  for (const record of records) {
    for (const key of Object.keys(record)) if (!headers.includes(key)) headers.push(key);
  }
  const rows = records.map((record) =>
    headers.map((key) =>
      name === "blobs" && key === "data"
        ? `(image, ${String(record.size ?? "?")} octets)`
        : cellValue(record[key]),
    ),
  );
  return { headers, rows };
}

export async function snapshotWorkbook(snapshot: Snapshot): Promise<ArrayBuffer> {
  const { default: ExcelJS } = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  workbook.created = new Date(snapshot.exportedAt);
  for (const name of TABLE_NAMES) {
    const sheet = workbook.addWorksheet(SHEET_NAMES[name]);
    const { headers, rows } = tableRows(
      name,
      snapshot.tables[name] as unknown as Record<string, unknown>[],
    );
    if (headers.length === 0) {
      sheet.addRow(["(vide)"]);
      continue;
    }
    sheet.addRow(headers).font = { bold: true };
    for (const row of rows) sheet.addRow(row);
  }
  const settings = workbook.addWorksheet("Réglages");
  settings.addRow(["Champ", "Valeur"]).font = { bold: true };
  settings.addRow(["schemaVersion", snapshot.schemaVersion]);
  settings.addRow(["exportedAt", snapshot.exportedAt]);
  for (const [key, value] of Object.entries(snapshot.meta.settings ?? {})) {
    settings.addRow([key, cellValue(value)]);
  }
  return (await workbook.xlsx.writeBuffer()) as ArrayBuffer;
}
