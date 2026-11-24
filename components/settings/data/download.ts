import type { BackupHandler } from "@/lib/database/repository";
import type { DataServices } from "@/lib/database/client";
import { exportFileName, snapshotJson } from "@/lib/data/export";

/** Téléchargement d'un fichier produit dans le navigateur. */
export function downloadFile(name: string, data: BlobPart, type: string): void {
  const url = URL.createObjectURL(new Blob([data], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Sauvegarde automatique avant un remplacement : copie dans `data/backups/` par la synchro
 * fichier, et, si elle est indisponible, téléchargement d'un export JSON.
 */
export function backupBeforeReplace(services: DataServices): BackupHandler {
  return async (current) => {
    try {
      await services.fileSync.pushSnapshot(current, "pre-replace");
    } catch {
      downloadFile(
        exportFileName("avant-remplacement", "json", new Date()),
        snapshotJson(current),
        "application/json",
      );
    }
  };
}
