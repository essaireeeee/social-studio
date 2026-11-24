/**
 * Exports (section 16.3) : JSON intégral (toutes les tables et `schemaVersion`, jamais de
 * clé), CSV de la bibliothèque (UTF-8 avec BOM, lisible par un tableur, colonnes de
 * l'import CSV). Logique pure ; le téléchargement est fait par l'interface.
 */
import Papa from "papaparse";
import { getCategory } from "@/lib/categories/registry";
import type { Snapshot } from "@/lib/database/snapshot";
import { eventLabelOf } from "@/lib/generation/native/context";
import { IMPORT_COLUMNS } from "@/lib/import/table";
import { PLATFORM_RULES } from "@/lib/platforms/rules";
import { fighterName } from "@/lib/studio/fighter-search";
import type { Fighter, HexEvent, Wording } from "@/types/domain";

/** Marque d'ordre des octets : Excel reconnaît alors l'UTF-8 (accents, emojis). */
export const UTF8_BOM = String.fromCodePoint(0xfeff);

/** « hexagone-studio-2026-11-24-1430.json » (heure locale). */
export function exportFileName(kind: string, extension: string, now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
  return `hexagone-studio-${kind}-${stamp}.${extension}`;
}

export const snapshotJson = (snapshot: Snapshot): string => `${JSON.stringify(snapshot, null, 2)}\n`;

/**
 * Bibliothèque en CSV (séparateur « ; », fins de ligne CRLF, BOM). Mêmes colonnes que
 * l'import CSV : le fichier se réimporte tel quel. Les exemples fictifs sont exclus.
 */
export function libraryCsv(
  wordings: readonly Wording[],
  sources: { fighters: readonly Fighter[]; events: readonly HexEvent[] },
): string {
  const rows = wordings
    .filter((w) => !w.isDemo)
    .sort((a, b) => (b.date ?? b.createdAt).localeCompare(a.date ?? a.createdAt))
    .map((w) => {
      const event = sources.events.find((e) => e.id === w.eventId);
      const values: Record<(typeof IMPORT_COLUMNS)[number], string> = {
        texte: w.text,
        mode: w.mode,
        categorie: getCategory(w.categoryId)?.id ?? w.categoryId,
        combattants: w.fighterIds
          .map((id) => sources.fighters.find((f) => f.id === id))
          .filter((f): f is Fighter => Boolean(f))
          .map(fighterName)
          .join("; "),
        evenement: event ? eventLabelOf(event.name, event.number) : "",
        date: w.date?.slice(0, 10) ?? "",
        reseau: PLATFORM_RULES[w.platform].label,
        lien: w.instagramUrl ?? "",
        hashtags: w.hashtags.join(" "),
        cta: w.cta ?? "",
        tags: w.tags.join(", "),
        commentaire: w.internalNotes ?? "",
      };
      return IMPORT_COLUMNS.map((column) => values[column]);
    });
  const csv = Papa.unparse(
    { fields: [...IMPORT_COLUMNS], data: rows },
    { delimiter: ";", newline: "\r\n", quotes: true },
  );
  return `${UTF8_BOM}${csv}\r\n`;
}
