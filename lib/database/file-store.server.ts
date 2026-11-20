/**
 * Fichier de sauvegarde local, côté serveur uniquement (Node.js `fs`).
 *
 * - Fichier principal : `<dir>/hexagone-studio.json`, écrit de manière atomique
 *   (fichier temporaire puis `rename`).
 * - Fiche résumé : `<dir>/hexagone-studio.meta.json` (date, volumes), pour éviter
 *   de relire un gros fichier à chaque écriture.
 * - Sauvegardes horodatées : `<dir>/backups/`, les `maxBackups` plus récentes sont conservées.
 *
 * Ne jamais importer ce module depuis du code client.
 */
import { randomUUID } from "node:crypto";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile, copyFile } from "node:fs/promises";
import path from "node:path";
import type { SnapshotCounts } from "./snapshot";

export const MAIN_FILE = "hexagone-studio.json";
export const SUMMARY_FILE = "hexagone-studio.meta.json";
export const BACKUP_DIR = "backups";
const BACKUP_NAME = /^hexagone-studio-(\d{8})-(\d{6})-(\d{3})(?:-(\d+))?\.json$/;

export type SnapshotReason = "auto" | "manual" | "pre-replace";

export interface StorageConfig {
  enabled: boolean;
  dir: string;
  maxBytes: number;
  /** Intervalle minimal entre deux sauvegardes automatiques horodatées. */
  backupIntervalMs: number;
  maxBackups: number;
}

const MB = 1024 * 1024;

function positiveNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/** Lu à chaque requête : un changement de `.env.local` s'applique au redémarrage du serveur. */
export function getStorageConfig(
  env: Record<string, string | undefined> = process.env,
): StorageConfig {
  return {
    enabled: (env.FILE_SYNC_ENABLED ?? "true").trim().toLowerCase() !== "false",
    // Dossier lu à l'exécution : exclu du traçage de fichiers du build.
    dir: path.resolve(
      /*turbopackIgnore: true*/ env.STORAGE_DIR?.trim() || path.join(process.cwd(), "data"),
    ),
    maxBytes: positiveNumber(env.STORAGE_MAX_BYTES, 50 * MB),
    backupIntervalMs: positiveNumber(env.STORAGE_BACKUP_INTERVAL_MS, 5 * 60 * 1000),
    maxBackups: 10,
  };
}

export interface FileSummary {
  savedAt: string;
  schemaVersion: number;
  counts: SnapshotCounts;
}

export interface WriteResult {
  file: string;
  backups: string[];
}

const pad = (value: number, size = 2) => String(value).padStart(size, "0");

function backupBaseName(date: Date): string {
  const day = `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}`;
  const time = `${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}`;
  return `hexagone-studio-${day}-${time}-${pad(date.getUTCMilliseconds(), 3)}`;
}

/** Date encodée dans le nom d'une sauvegarde, ou `null` si le nom n'est pas reconnu. */
export function backupDate(name: string): Date | null {
  const match = BACKUP_NAME.exec(name);
  if (!match) return null;
  const [, day, time, ms] = match;
  return new Date(
    Date.UTC(
      Number(day.slice(0, 4)),
      Number(day.slice(4, 6)) - 1,
      Number(day.slice(6, 8)),
      Number(time.slice(0, 2)),
      Number(time.slice(2, 4)),
      Number(time.slice(4, 6)),
      Number(ms),
    ),
  );
}

export function isBackupName(name: string): boolean {
  return BACKUP_NAME.test(name);
}

async function writeAtomic(target: string, content: string): Promise<void> {
  const temp = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, content, "utf8");
    await rename(temp, target);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

async function uniqueBackupPath(backupDir: string, date: Date): Promise<string> {
  const base = backupBaseName(date);
  const existing = new Set(await readdir(backupDir));
  let name = `${base}.json`;
  for (let suffix = 1; existing.has(name); suffix += 1) {
    name = `${base}-${suffix}.json`;
  }
  return path.join(backupDir, name);
}

export interface BackupInfo {
  name: string;
  savedAt: string;
  size: number;
}

export async function listBackups(config: StorageConfig): Promise<BackupInfo[]> {
  const dir = path.join(config.dir, BACKUP_DIR);
  let names: string[];
  try {
    names = await readdir(dir);
  } catch {
    return [];
  }
  const infos = await Promise.all(
    names.filter(isBackupName).map(async (name) => ({
      name,
      savedAt: backupDate(name)!.toISOString(),
      size: (await stat(path.join(dir, name))).size,
    })),
  );
  // Plus récente en premier ; le nom encode la date, le suffixe départage les égalités.
  return infos.sort((a, b) => b.name.localeCompare(a.name, "en", { numeric: true }));
}

async function pruneBackups(config: StorageConfig): Promise<void> {
  const backups = await listBackups(config);
  await Promise.all(
    backups
      .slice(config.maxBackups)
      .map((backup) => rm(path.join(config.dir, BACKUP_DIR, backup.name), { force: true })),
  );
}

export async function readSummary(config: StorageConfig): Promise<FileSummary | null> {
  try {
    return JSON.parse(await readFile(path.join(config.dir, SUMMARY_FILE), "utf8")) as FileSummary;
  } catch {
    return null;
  }
}

async function exists(file: string): Promise<boolean> {
  try {
    await stat(file);
    return true;
  } catch {
    return false;
  }
}

/**
 * Écrit l'instantané (JSON déjà validé et sérialisé).
 *
 * Sauvegardes horodatées :
 * - une copie du nouvel instantané si la dernière sauvegarde a plus de `backupIntervalMs`,
 *   s'il n'en existe aucune, ou si la raison n'est pas `auto` ;
 * - une copie de l'ANCIEN fichier principal, avant écrasement, si le nouvel instantané
 *   contient moins de wordings que lui (protection contre l'écrasement de données réelles).
 */
export async function writeSnapshot(
  config: StorageConfig,
  content: string,
  summary: FileSummary,
  reason: SnapshotReason,
  now: Date = new Date(),
): Promise<WriteResult> {
  const backupDir = path.join(config.dir, BACKUP_DIR);
  await mkdir(backupDir, { recursive: true });
  const mainFile = path.join(config.dir, MAIN_FILE);
  const created: string[] = [];

  const previous = await readSummary(config);
  if (previous && previous.counts.wordings > summary.counts.wordings && (await exists(mainFile))) {
    const target = await uniqueBackupPath(backupDir, now);
    await copyFile(mainFile, target);
    created.push(target);
  }

  await writeAtomic(mainFile, content);
  await writeAtomic(path.join(config.dir, SUMMARY_FILE), JSON.stringify(summary, null, 2));

  const latest = (await listBackups(config))[0];
  const latestDate = latest ? backupDate(latest.name) : null;
  const due =
    reason !== "auto" ||
    !latestDate ||
    now.getTime() - latestDate.getTime() >= config.backupIntervalMs ||
    created.length > 0;
  if (due) {
    const target = await uniqueBackupPath(backupDir, now);
    await copyFile(mainFile, target);
    created.push(target);
  }

  await pruneBackups(config);
  return { file: mainFile, backups: created };
}

export interface StoredFile {
  name: string;
  content: string;
  modifiedAt: string;
}

export async function readMainFile(config: StorageConfig): Promise<StoredFile | null> {
  const file = path.join(config.dir, MAIN_FILE);
  try {
    const [content, info] = await Promise.all([readFile(file, "utf8"), stat(file)]);
    return { name: MAIN_FILE, content, modifiedAt: info.mtime.toISOString() };
  } catch {
    return null;
  }
}

/** Lit une sauvegarde par son nom. Le nom est validé : aucun chemin arbitraire n'est accepté. */
export async function readBackupFile(
  config: StorageConfig,
  name: string,
): Promise<StoredFile | null> {
  if (!isBackupName(name)) return null;
  const file = path.join(config.dir, BACKUP_DIR, name);
  try {
    const [content, info] = await Promise.all([readFile(file, "utf8"), stat(file)]);
    return { name, content, modifiedAt: info.mtime.toISOString() };
  } catch {
    return null;
  }
}

/** Erreurs d'écriture qui signalent un environnement en lecture seule. */
export function isReadOnlyError(error: unknown): boolean {
  const code = (error as NodeJS.ErrnoException | undefined)?.code;
  return code === "EROFS" || code === "EACCES" || code === "EPERM";
}
