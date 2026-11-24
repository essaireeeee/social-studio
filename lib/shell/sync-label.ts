/** Libellé de l'état de la sauvegarde fichier (header et dashboard). */
import type { FileSyncState } from "@/lib/database/file-sync";
import { formatRelative } from "@/lib/format";

export function syncLabel(
  sync: FileSyncState,
  now: Date | null,
): { text: string; tone: "neutral" | "busy" | "danger" } {
  if (sync.status === "pending" || sync.status === "saving")
    return { text: "Enregistrement…", tone: "busy" };
  if (sync.status === "saved" && sync.lastSavedAt) {
    return {
      text: now ? `Sauvegardé · ${formatRelative(sync.lastSavedAt, now)}` : "Sauvegardé",
      tone: "neutral",
    };
  }
  if (sync.status === "error") return { text: "Sauvegarde en erreur", tone: "danger" };
  if (sync.status === "disabled") return { text: "Sauvegarde fichier désactivée", tone: "neutral" };
  return { text: "Sauvegarde locale", tone: "neutral" };
}
