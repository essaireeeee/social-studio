/**
 * Lignes de l'étape « Vérifier » (section 14.3) : une publication par ligne, avec mode et
 * catégorie proposés, plateforme, statut de doublon et case « Importer ». Les doublons sont
 * décochés par défaut. Logique pure (le hachage est asynchrone).
 */
import { getCategory } from "@/lib/categories/registry";
import { sha256Hex } from "@/lib/database/hash";
import { normalizeText } from "@/lib/editorial/text-utils";
import type { Mode, Platform } from "@/types/domain";
import type { Classify } from "./classifier";
import { detectDuplicates, type DedupeItem, type Duplicate } from "./dedupe";
import type { ImportRecord } from "./table";

export interface ImportRow extends Omit<ImportRecord, "mode" | "categoryId" | "platform"> {
  key: string;
  hash: string;
  mode: Mode;
  categoryId?: string;
  /** Confiance du classifieur (1 si la catégorie vient du fichier). */
  confidence: number;
  needsReview: boolean;
  platform: Platform;
  duplicate: Duplicate;
  selected: boolean;
}

export interface RowContext {
  classify: Classify;
  /** Publications déjà en bibliothèque, pour les doublons. */
  library: readonly DedupeItem[];
  defaultPlatform?: Platform;
}

let counter = 0;
const nextKey = () => `row-${Date.now().toString(36)}-${(counter += 1)}`;

async function toRow(
  record: ImportRecord,
  ctx: RowContext,
): Promise<Omit<ImportRow, "duplicate" | "selected">> {
  const given = record.categoryId ? getCategory(record.categoryId) : undefined;
  const guess = given ? undefined : ctx.classify(record.text);
  const mode = given?.mode ?? record.mode ?? guess!.mode;
  // Une catégorie proposée d'un autre mode que celui du fichier est écartée.
  const categoryId =
    given?.id ??
    (guess?.categoryId && getCategory(guess.categoryId)?.mode === mode
      ? guess.categoryId
      : undefined);
  const confidence = given ? 1 : categoryId ? guess!.confidence : 0;
  return {
    ...record,
    key: nextKey(),
    hash: await sha256Hex(normalizeText(record.text)),
    mode,
    categoryId,
    confidence,
    needsReview: confidence < 0.4,
    platform: record.platform ?? ctx.defaultPlatform ?? "instagram",
  };
}

/** Recalcule les doublons ; une ligne qui devient doublon est décochée, jamais l'inverse. */
export function withDuplicates(
  rows: readonly Omit<ImportRow, "duplicate" | "selected">[] | readonly ImportRow[],
  library: readonly DedupeItem[],
): ImportRow[] {
  const status = detectDuplicates(
    rows.map((r) => ({ id: r.key, text: r.text, hash: r.hash })),
    library,
  );
  return rows.map((row) => {
    const duplicate = status.get(row.key)!;
    const previous = "selected" in row ? row.selected : true;
    return { ...row, duplicate, selected: duplicate.kind === "new" ? previous : false };
  });
}

export async function buildRows(
  records: readonly ImportRecord[],
  ctx: RowContext,
): Promise<ImportRow[]> {
  const rows = await Promise.all(records.map((r) => toRow(r, ctx)));
  return withDuplicates(rows, ctx.library);
}

/** Fusionne deux lignes (texte de la seconde ajouté après la première). */
export async function mergeRows(
  rows: readonly ImportRow[],
  firstKey: string,
  secondKey: string,
  ctx: RowContext,
): Promise<ImportRow[]> {
  const first = rows.find((r) => r.key === firstKey);
  const second = rows.find((r) => r.key === secondKey);
  if (!first || !second || first === second) return [...rows];
  const merged = await toRow(
    {
      ...first,
      text: `${first.text}\n\n${second.text}`,
      categoryId: undefined,
      mode: undefined,
      platform: first.platform,
    },
    ctx,
  );
  const next = rows
    .filter((r) => r.key !== secondKey)
    .map((r) => (r.key === firstKey ? { ...merged, duplicate: r.duplicate, selected: true } : r));
  return withDuplicates(next, ctx.library);
}

/** Scinde une ligne à la première ligne vide (ou à la moitié des paragraphes). */
export async function splitRow(
  rows: readonly ImportRow[],
  key: string,
  ctx: RowContext,
): Promise<ImportRow[]> {
  const row = rows.find((r) => r.key === key);
  if (!row) return [...rows];
  const paragraphs = row.text.split(/\n\s*\n/);
  if (paragraphs.length < 2) return [...rows];
  const cut = Math.max(1, Math.floor(paragraphs.length / 2));
  const parts = [paragraphs.slice(0, cut).join("\n\n"), paragraphs.slice(cut).join("\n\n")];
  const created = await Promise.all(
    parts.map((text) =>
      toRow({ text, platform: row.platform, date: row.date, url: undefined }, ctx),
    ),
  );
  const index = rows.findIndex((r) => r.key === key);
  const next = [...rows.slice(0, index), ...created, ...rows.slice(index + 1)];
  return withDuplicates(next, ctx.library);
}

export interface BulkPatch {
  mode?: Mode;
  categoryId?: string;
  platform?: Platform;
}

/** Action groupée sur les lignes cochées. Une catégorie impose son mode. */
export function applyToSelected(rows: readonly ImportRow[], patch: BulkPatch): ImportRow[] {
  const category = patch.categoryId ? getCategory(patch.categoryId) : undefined;
  return rows.map((row) => {
    if (!row.selected) return row;
    const mode = category?.mode ?? patch.mode ?? row.mode;
    const categoryId = category
      ? category.id
      : row.categoryId && getCategory(row.categoryId)?.mode === mode
        ? row.categoryId
        : undefined;
    return {
      ...row,
      mode,
      categoryId,
      platform: patch.platform ?? row.platform,
      ...(category ? { confidence: 1, needsReview: false } : {}),
    };
  });
}

export interface RowPatch {
  selected?: boolean;
  mode?: Mode;
  categoryId?: string;
  platform?: Platform;
}

/** Modification d'une ligne : une catégorie impose son mode, un mode écarte une catégorie d'un autre mode. */
export function updateRow(rows: readonly ImportRow[], key: string, patch: RowPatch): ImportRow[] {
  return rows.map((row) => {
    if (row.key !== key) return row;
    const next = { ...row, ...patch };
    if (patch.categoryId !== undefined) {
      const category = getCategory(patch.categoryId);
      return category
        ? {
            ...next,
            categoryId: category.id,
            mode: category.mode,
            confidence: 1,
            needsReview: false,
          }
        : { ...next, categoryId: undefined, confidence: 0, needsReview: true };
    }
    if (patch.mode && row.categoryId && getCategory(row.categoryId)?.mode !== patch.mode) {
      return { ...next, categoryId: undefined, confidence: 0, needsReview: true };
    }
    return next;
  });
}

const exactInLibrary = (row: ImportRow) => row.duplicate.kind === "exact" && !row.duplicate.inBatch;

/** « Remplacer » confirmé : les doublons exacts de la bibliothèque sont cochés (ou décochés). */
export function withReplace(rows: readonly ImportRow[], replace: boolean): ImportRow[] {
  return rows.map((row) => (exactInLibrary(row) ? { ...row, selected: replace } : row));
}

/** Ligne réellement écrite par `commitImport` avec ces options. */
export function willImport(row: ImportRow, replace = false): boolean {
  if (!row.selected || !row.categoryId) return false;
  if (row.duplicate.kind !== "exact") return true;
  return replace && exactInLibrary(row);
}

export interface ImportSummary {
  toImport: number;
  /** Parmi `toImport` : doublons exacts qui remplacent la version de la bibliothèque. */
  replaced: number;
  duplicatesIgnored: number;
  /** Lignes cochées sans catégorie : à compléter avant d'importer. */
  missingCategory: number;
}

export function summarize(rows: readonly ImportRow[], replace = false): ImportSummary {
  const imported = rows.filter((r) => willImport(r, replace));
  return {
    toImport: imported.length,
    replaced: imported.filter(exactInLibrary).length,
    duplicatesIgnored: rows.filter(
      (r) =>
        r.duplicate.kind !== "new" && !willImport(r, replace) && !(r.selected && !r.categoryId),
    ).length,
    missingCategory: rows.filter((r) => r.selected && !r.categoryId).length,
  };
}
