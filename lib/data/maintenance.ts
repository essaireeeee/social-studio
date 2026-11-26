/**
 * Maintenance des données (section 16.3) : suppression des exemples fictifs et
 * réinitialisation complète. La sauvegarde préalable est imposée par l'appelant.
 */
import { CURRENT_SCHEMA_VERSION } from "@/lib/database/migrations";
import type { BackupHandler, DataRepository } from "@/lib/database/repository";
import { runSeed } from "@/lib/database/seed";
import { TABLE_NAMES, type Snapshot } from "@/lib/database/snapshot";
import { APP_ID, SettingsSchema } from "@/types/domain";

/** Supprime les publications fictives. Renvoie le nombre supprimé. */
export async function deleteDemoWordings(repository: DataRepository): Promise<number> {
  const demos = await repository.wordings.list({ filter: (w) => w.isDemo });
  for (const demo of demos) await repository.wordings.delete(demo.id);
  return demos.length;
}

/** Instantané vide : tables vides, réglages par défaut, seed à rejouer. */
export function emptySnapshot(now: Date): Snapshot {
  return {
    app: APP_ID,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    tables: Object.fromEntries(TABLE_NAMES.map((name) => [name, []])) as unknown as Snapshot["tables"],
    meta: { seedVersion: 0, settings: SettingsSchema.parse({}), hookBank: [] },
  };
}

/**
 * Réinitialise l'application : tout est effacé (après `backup`), puis les données du premier
 * lancement sont réécrites (exemples fictifs, règles, profil par défaut).
 */
export async function resetApplication(
  repository: DataRepository,
  backup: BackupHandler,
  now: Date = new Date(),
): Promise<void> {
  await repository.importAll(emptySnapshot(now), "replace", { backup });
  await runSeed(repository, now);
}
