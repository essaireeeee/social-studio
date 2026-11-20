/**
 * Services de données du navigateur (singletons) : repository Dexie + synchro fichier.
 * N'utiliser que depuis du code client.
 */
import { DexieRepository } from "./dexie-repository";
import { FileSyncService, type FileSyncOptions } from "./file-sync";
import type { ImportReport, ImportStrategy } from "./repository";

export interface DataServices {
  repository: DexieRepository;
  fileSync: FileSyncService;
  /** Import avec sauvegarde préalable de l'état courant dans `data/backups/` en cas de remplacement. */
  importSnapshot(snapshot: unknown, strategy: ImportStrategy): Promise<ImportReport>;
}

/** Assemble repository et synchro fichier : chaque écriture en base déclenche une synchro. */
export function createDataServices(
  repository: DexieRepository = new DexieRepository(),
  fileSyncOptions: Omit<FileSyncOptions, "exportSnapshot"> = {},
): DataServices {
  const fileSync = new FileSyncService({
    ...fileSyncOptions,
    exportSnapshot: () => repository.exportAll(),
  });
  repository.onChange(() => fileSync.notifyChange());
  return {
    repository,
    fileSync,
    importSnapshot: (snapshot, strategy) =>
      repository.importAll(snapshot, strategy, {
        backup: (current) => fileSync.pushSnapshot(current, "pre-replace"),
      }),
  };
}

let services: DataServices | null = null;

export function getDataServices(): DataServices {
  if (typeof window === "undefined") {
    throw new Error("Les données locales ne sont accessibles que dans le navigateur.");
  }
  services ??= createDataServices();
  return services;
}
