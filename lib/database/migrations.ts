/**
 * Versions de schéma des instantanés (export JSON, fichier local, sauvegardes).
 *
 * Chaque export porte `schemaVersion`. À l'import, l'instantané est migré pas à pas
 * jusqu'à la version courante, puis validé par Zod.
 *
 * Pour faire évoluer le schéma :
 * 1. incrémenter `CURRENT_SCHEMA_VERSION` ;
 * 2. ajouter `MIGRATIONS[ancienneVersion]`, qui transforme un instantané vN en vN+1 ;
 * 3. si les index IndexedDB changent, ajouter `db.version(N).stores(...)` dans `db.ts`.
 *
 * Historique :
 * - v1 : schéma initial (Phase 1).
 * - v2 : dix tables ajoutées (calendrier, rappels, campagnes, suggestions, Atelier Français,
 *   actualité, engagement) et `milestones` sur les événements. Rien n'est retiré ni renommé.
 */
import { APP_ID } from "@/types/domain";
import { SnapshotSchema, V2_TABLE_NAMES, type Snapshot } from "./snapshot";

export const CURRENT_SCHEMA_VERSION = 2;

type RawSnapshot = Record<string, unknown>;
type Migration = (snapshot: RawSnapshot) => RawSnapshot;

/** v1 → v2 : nouvelles tables vides, jalons vides sur chaque événement. */
function migrateV1toV2(snapshot: RawSnapshot): RawSnapshot {
  const tables = isRecord(snapshot.tables) ? { ...snapshot.tables } : {};
  for (const name of V2_TABLE_NAMES) {
    if (!Array.isArray(tables[name])) tables[name] = [];
  }
  if (Array.isArray(tables.events)) {
    tables.events = tables.events.map((event: unknown) =>
      isRecord(event) && !Array.isArray(event.milestones) ? { ...event, milestones: [] } : event,
    );
  }
  return { ...snapshot, tables };
}

/** `MIGRATIONS[n]` transforme un instantané de la version n vers la version n + 1. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {
  1: migrateV1toV2,
};

export class SnapshotError extends Error {
  override name = "SnapshotError";
}

function isRecord(value: unknown): value is RawSnapshot {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Migre puis valide un instantané. Lève `SnapshotError` avec un message lisible. */
export function migrateSnapshot(raw: unknown): Snapshot {
  if (!isRecord(raw)) {
    throw new SnapshotError("Le contenu n'est pas un instantané HEXAGONE MMA Social Studio.");
  }
  if (raw.app !== APP_ID) {
    throw new SnapshotError("Ce fichier ne provient pas de HEXAGONE MMA Social Studio.");
  }

  const version = raw.schemaVersion;
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1) {
    throw new SnapshotError("Version de schéma absente ou invalide.");
  }
  if (version > CURRENT_SCHEMA_VERSION) {
    throw new SnapshotError(
      `Cet instantané vient d'une version plus récente de l'application (schéma ${version}, version actuelle ${CURRENT_SCHEMA_VERSION}).`,
    );
  }

  let current: RawSnapshot = raw;
  for (let step = version; step < CURRENT_SCHEMA_VERSION; step += 1) {
    const migration = MIGRATIONS[step];
    if (!migration) {
      throw new SnapshotError(`Migration manquante du schéma ${step} vers ${step + 1}.`);
    }
    current = { ...migration(current), schemaVersion: step + 1 };
  }

  const result = SnapshotSchema.safeParse(current);
  if (!result.success) {
    const first = result.error.issues[0];
    const where = first?.path.join(".") || "racine";
    throw new SnapshotError(`Instantané invalide (${where} : ${first?.message ?? "inconnu"}).`);
  }
  return result.data;
}
