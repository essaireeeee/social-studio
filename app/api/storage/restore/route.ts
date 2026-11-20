import {
  getStorageConfig,
  listBackups,
  readBackupFile,
  readMainFile,
} from "@/lib/database/file-store.server";
import { SnapshotError, migrateSnapshot } from "@/lib/database/migrations";
import { countSnapshot } from "@/lib/database/snapshot";

function reply(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Lecture du fichier de sauvegarde local.
 * - sans paramètre : résumé du dernier instantané (date, volumes) ;
 * - `?include=snapshot` : ajoute l'instantané complet ;
 * - `?backup=<nom>` : cible une sauvegarde de `data/backups/` ;
 * - `?list=backups` : liste des sauvegardes disponibles.
 */
export async function GET(request: Request): Promise<Response> {
  const params = new URL(request.url).searchParams;
  const config = getStorageConfig();
  if (!config.enabled) {
    return reply({ enabled: false, found: false });
  }

  if (params.get("list") === "backups") {
    return reply({ enabled: true, backups: await listBackups(config) });
  }

  const backupName = params.get("backup");
  const file = backupName ? await readBackupFile(config, backupName) : await readMainFile(config);
  if (!file) {
    return reply({ enabled: true, found: false }, backupName ? 404 : 200);
  }

  let snapshot;
  try {
    snapshot = migrateSnapshot(JSON.parse(file.content));
  } catch (error) {
    const message =
      error instanceof SnapshotError ? error.message : "Fichier illisible (JSON invalide).";
    return reply(
      { enabled: true, found: true, valid: false, name: file.name, error: message },
      422,
    );
  }

  const body: Record<string, unknown> = {
    enabled: true,
    found: true,
    valid: true,
    source: backupName ? "backup" : "main",
    name: file.name,
    savedAt: snapshot.exportedAt,
    schemaVersion: snapshot.schemaVersion,
    counts: countSnapshot(snapshot),
  };
  if (params.get("include") === "snapshot") {
    body.snapshot = snapshot;
  }
  return reply(body);
}
