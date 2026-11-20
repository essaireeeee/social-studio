import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BACKUP_DIR,
  MAIN_FILE,
  backupDate,
  getStorageConfig,
  isReadOnlyError,
  listBackups,
  readBackupFile,
  writeSnapshot,
  type FileSummary,
  type StorageConfig,
} from "@/lib/database/file-store.server";
import { TABLE_NAMES, type SnapshotCounts } from "@/lib/database/snapshot";

let dir: string;
let config: StorageConfig;

const T0 = new Date("2026-11-20T14:00:00.000Z");
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

function summary(wordings: number, now = T0): FileSummary {
  const counts = Object.fromEntries(TABLE_NAMES.map((n) => [n, 0])) as SnapshotCounts;
  counts.wordings = wordings;
  return { savedAt: now.toISOString(), schemaVersion: 1, counts };
}

const content = (wordings: number) => JSON.stringify({ wordings });

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "hex-store-"));
  config = { ...getStorageConfig({ STORAGE_DIR: dir }), backupIntervalMs: 5 * 60_000 };
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("writeSnapshot", () => {
  it("écrit le fichier principal, la fiche résumé et une première sauvegarde horodatée", async () => {
    const result = await writeSnapshot(config, content(3), summary(3), "auto", T0);
    expect(await readFile(path.join(dir, MAIN_FILE), "utf8")).toBe(content(3));
    expect(result.backups).toHaveLength(1);
    expect(path.basename(result.backups[0]!)).toBe("hexagone-studio-20261120-140000-000.json");
    // Aucun fichier temporaire ne traîne après l'écriture atomique.
    expect((await readdir(dir)).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("limite les sauvegardes automatiques à une par intervalle", async () => {
    await writeSnapshot(config, content(3), summary(3), "auto", at(0));
    const second = await writeSnapshot(config, content(4), summary(4), "auto", at(1));
    expect(second.backups).toEqual([]);
    const third = await writeSnapshot(config, content(5), summary(5), "auto", at(6));
    expect(third.backups).toHaveLength(1);
    expect(await listBackups(config)).toHaveLength(2);
  });

  it("crée toujours une sauvegarde pour une raison explicite", async () => {
    await writeSnapshot(config, content(3), summary(3), "auto", at(0));
    const manual = await writeSnapshot(config, content(3), summary(3), "manual", at(0));
    expect(manual.backups).toHaveLength(1);
    // Même milliseconde : le nom reçoit un suffixe au lieu d'écraser.
    expect(path.basename(manual.backups[0]!)).toBe("hexagone-studio-20261120-140000-000-1.json");
  });

  it("conserve les 10 sauvegardes les plus récentes", async () => {
    for (let i = 0; i < 12; i += 1) {
      await writeSnapshot(config, content(i), summary(i), "manual", at(i));
    }
    const backups = await listBackups(config);
    expect(backups).toHaveLength(10);
    expect(backups[0]?.savedAt).toBe(at(11).toISOString());
    expect(backups.at(-1)?.savedAt).toBe(at(2).toISOString());
  });

  it("sauvegarde l'ancien fichier avant d'écrire un instantané avec moins de wordings", async () => {
    await writeSnapshot(config, content(50), summary(50), "auto", at(0));
    const shrink = await writeSnapshot(config, content(6), summary(6), "auto", at(1));
    expect(shrink.backups.length).toBeGreaterThanOrEqual(1);
    const saved = await readFile(shrink.backups[0]!, "utf8");
    expect(saved).toBe(content(50));
    expect(await readFile(path.join(dir, MAIN_FILE), "utf8")).toBe(content(6));
  });
});

describe("lecture et noms de sauvegarde", () => {
  it("décode la date d'une sauvegarde et refuse les autres noms", () => {
    expect(backupDate("hexagone-studio-20261120-140512-034.json")?.toISOString()).toBe(
      "2026-11-20T14:05:12.034Z",
    );
    expect(backupDate("autre.json")).toBeNull();
  });

  it("refuse de lire un chemin arbitraire", async () => {
    await writeSnapshot(config, content(1), summary(1), "auto", T0);
    expect(await readBackupFile(config, "../hexagone-studio.json")).toBeNull();
    expect(await readBackupFile(config, "../../etc/passwd")).toBeNull();
    const [first] = await readdir(path.join(dir, BACKUP_DIR));
    expect((await readBackupFile(config, first!))?.content).toBe(content(1));
  });
});

describe("configuration", () => {
  it("lit les variables d'environnement avec des valeurs par défaut sûres", () => {
    const defaults = getStorageConfig({});
    expect(defaults.enabled).toBe(true);
    expect(defaults.dir).toBe(path.join(process.cwd(), "data"));
    expect(defaults.maxBytes).toBe(50 * 1024 * 1024);
    expect(defaults.maxBackups).toBe(10);

    const custom = getStorageConfig({ FILE_SYNC_ENABLED: "false", STORAGE_MAX_BYTES: "abc" });
    expect(custom.enabled).toBe(false);
    expect(custom.maxBytes).toBe(50 * 1024 * 1024);
  });

  it("reconnaît les erreurs de lecture seule", () => {
    expect(isReadOnlyError(Object.assign(new Error("ro"), { code: "EROFS" }))).toBe(true);
    expect(isReadOnlyError(Object.assign(new Error("acces"), { code: "EACCES" }))).toBe(true);
    expect(isReadOnlyError(new Error("autre"))).toBe(false);
  });
});
