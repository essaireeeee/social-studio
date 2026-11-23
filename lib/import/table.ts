/**
 * Import de tableaux (section 14.4) : colonnes reconnues sans tenir compte de la casse ni
 * des accents, correspondance proposée, puis conversion en publications à vérifier.
 * Logique pure ; la lecture des fichiers est dans `csv.ts` et `excel.ts`.
 */
import { CATEGORIES, getCategory } from "@/lib/categories/registry";
import { normalizeText } from "@/lib/editorial/text-utils";
import { PLATFORMS } from "@/lib/platforms/rules";
import type { Mode, Platform } from "@/types/domain";

export const IMPORT_COLUMNS = [
  "texte",
  "mode",
  "categorie",
  "combattants",
  "evenement",
  "date",
  "reseau",
  "lien",
  "hashtags",
  "cta",
  "tags",
  "commentaire",
] as const;
export type ImportColumn = (typeof IMPORT_COLUMNS)[number];

export const COLUMN_LABELS: Record<ImportColumn, string> = {
  texte: "Texte (requis)",
  mode: "Mode",
  categorie: "Catégorie",
  combattants: "Combattants",
  evenement: "Événement",
  date: "Date",
  reseau: "Réseau",
  lien: "Lien",
  hashtags: "Hashtags",
  cta: "CTA",
  tags: "Tags",
  commentaire: "Commentaire",
};

const ALIASES: Record<ImportColumn, readonly string[]> = {
  texte: ["texte", "text", "legende", "caption", "wording", "contenu", "message", "publication"],
  mode: ["mode"],
  categorie: ["categorie", "category", "type"],
  combattants: ["combattants", "combattant", "fighters", "fighter"],
  evenement: ["evenement", "event", "soiree"],
  date: ["date", "date de publication", "publie le"],
  reseau: ["reseau", "plateforme", "platform", "network"],
  lien: ["lien", "url", "link", "lien instagram"],
  hashtags: ["hashtags", "hashtag"],
  cta: ["cta", "appel a l action"],
  tags: ["tags", "etiquettes"],
  commentaire: ["commentaire", "commentaires", "notes", "note interne", "commentaire interne"],
};

export type ColumnMapping = Partial<Record<ImportColumn, number>>;

export interface Table {
  headers: string[];
  rows: string[][];
}

export const normalizeHeader = (header: string) =>
  normalizeText(header)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Correspondance proposée : en-tête reconnu → colonne. */
export function suggestMapping(headers: readonly string[]): ColumnMapping {
  const mapping: ColumnMapping = {};
  headers.forEach((header, index) => {
    const key = normalizeHeader(header);
    const column = IMPORT_COLUMNS.find((c) => ALIASES[c].includes(key));
    if (column && mapping[column] === undefined) mapping[column] = index;
  });
  return mapping;
}

/** L'écran de correspondance s'affiche si le texte n'est pas trouvé ou si un en-tête est inconnu. */
export function needsMapping(headers: readonly string[], mapping: ColumnMapping): boolean {
  const used = new Set(Object.values(mapping));
  return mapping.texte === undefined || headers.some((h, i) => h.trim() !== "" && !used.has(i));
}

export interface ImportRecord {
  text: string;
  mode?: Mode;
  categoryId?: string;
  fighters?: string[];
  event?: string;
  /** AAAA-MM-JJ */
  date?: string;
  platform?: Platform;
  url?: string;
  hashtags?: string[];
  cta?: string;
  tags?: string[];
  notes?: string;
}

const list = (value: string) =>
  value
    .split(/[;,\n]/)
    .map((v) => v.trim())
    .filter(Boolean);

export function parseMode(value: string): Mode | undefined {
  const v = normalizeHeader(value);
  if (/^live( show)?$/.test(v)) return "live";
  if (/^daily( media)?$/.test(v) || v === "media") return "daily";
  return undefined;
}

/** Identifiant ou libellé de catégorie (« KO / TKO », « live_ko »). */
export function parseCategory(value: string): string | undefined {
  if (getCategory(value.trim())) return value.trim();
  const v = normalizeHeader(value);
  return CATEGORIES.find((c) => normalizeHeader(c.label) === v)?.id;
}

export function parsePlatform(value: string): Platform | undefined {
  const v = normalizeHeader(value);
  if (v === "twitter") return "x";
  return PLATFORMS.find((p) => p === v);
}

/** « 2026-03-14 », « 14/03/2026 » ou « 14/03/26 » → « 2026-03-14 ». */
export function parseDate(value: string): string | undefined {
  const v = value.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(v);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const fr = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/.exec(v);
  if (!fr) return undefined;
  const year = fr[3]!.length === 2 ? `20${fr[3]}` : fr[3]!;
  const date = `${year}-${fr[2]!.padStart(2, "0")}-${fr[1]!.padStart(2, "0")}`;
  // Le moteur JavaScript accepte « 31 février » : jour et mois sont revérifiés.
  const parsed = new Date(`${date}T00:00:00Z`);
  return parsed.getUTCDate() === Number(fr[1]) && parsed.getUTCMonth() + 1 === Number(fr[2])
    ? date
    : undefined;
}

/** Lignes du tableau → publications ; les lignes sans texte sont ignorées. */
export function recordsFromTable(table: Table, mapping: ColumnMapping): ImportRecord[] {
  const cell = (row: string[], column: ImportColumn) => {
    const index = mapping[column];
    return index === undefined ? "" : (row[index] ?? "").trim();
  };
  return table.rows
    .map((row): ImportRecord | null => {
      const text = cell(row, "texte");
      if (!text) return null;
      const hashtags = cell(row, "hashtags");
      return {
        text,
        mode: parseMode(cell(row, "mode")),
        categoryId: parseCategory(cell(row, "categorie")),
        fighters: list(cell(row, "combattants")),
        event: cell(row, "evenement") || undefined,
        date: parseDate(cell(row, "date")),
        platform: parsePlatform(cell(row, "reseau")),
        url: cell(row, "lien") || undefined,
        hashtags: hashtags
          ? list(hashtags.replace(/\s+(?=#)/g, ";")).map((t) => (t.startsWith("#") ? t : `#${t}`))
          : undefined,
        cta: cell(row, "cta") || undefined,
        tags: list(cell(row, "tags")),
        notes: cell(row, "commentaire") || undefined,
      };
    })
    .filter((r): r is ImportRecord => r !== null);
}

/** Modèle CSV téléchargeable : les en-têtes et une ligne d'exemple à remplacer. */
export const CSV_TEMPLATE = [
  IMPORT_COLUMNS.join(","),
  [
    '"Texte de la publication, tel que publié (remplacez cette ligne)"',
    "live",
    "live_ko",
    '"Prénom Nom; Prénom Nom"',
    '"HEXAGONE MMA 12"',
    "2026-03-14",
    "instagram",
    "",
    '"#HexagoneMMA"',
    "",
    "",
    "",
  ].join(","),
].join("\r\n");
