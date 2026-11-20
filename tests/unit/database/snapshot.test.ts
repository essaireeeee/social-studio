import { afterEach, describe, expect, it, vi } from "vitest";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import {
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  SnapshotError,
  migrateSnapshot,
} from "@/lib/database/migrations";
import { BackupRequiredError, type EntityStore } from "@/lib/database/repository";
import { runSeed } from "@/lib/database/seed";
import { TABLE_NAMES, findForbiddenFields } from "@/lib/database/snapshot";
import { APP_ID } from "@/types/domain";
import {
  createTestRepository,
  disposeRepository,
  fixedNow,
  sampleEntities,
  sampleWording,
} from "../../fixtures/entities";

const repositories: DexieRepository[] = [];
function repo(): DexieRepository {
  const created = createTestRepository();
  repositories.push(created);
  return created;
}

afterEach(async () => {
  await Promise.all(repositories.splice(0).map(disposeRepository));
});

/** Base peuplée : seed + une entité de chaque table + réglages modifiés. */
async function populated(): Promise<DexieRepository> {
  const repository = repo();
  await runSeed(repository, fixedNow());
  const entities = await sampleEntities();
  for (const table of TABLE_NAMES) {
    const store = repository[table] as unknown as EntityStore<(typeof entities)[typeof table]>;
    await store.put(entities[table]);
  }
  const settings = await repository.getSettings();
  await repository.saveSettings({ ...settings, accountName: "compte_test", igTruncation: 150 });
  await repository.setMeta("lastBackupAt", "2026-11-19T10:00:00.000Z");
  return repository;
}

describe("export / import JSON", () => {
  it("round-trip : export, JSON, import dans une base vide, export identique", async () => {
    const source = await populated();
    const exported = await source.exportAll();
    const json = JSON.stringify(exported);

    const target = repo();
    const report = await target.importAll(JSON.parse(json), "replace");
    expect(report.backupCreated).toBe(false);
    expect(report.added.wordings).toBe(7);

    expect(await target.exportAll()).toEqual(exported);
  });

  it("l'export porte la version de schéma et ne contient aucun champ clé ou jeton", async () => {
    const exported = await (await populated()).exportAll();
    expect(exported.app).toBe(APP_ID);
    expect(exported.schemaVersion).toBe(CURRENT_SCHEMA_VERSION);
    expect(findForbiddenFields(exported)).toEqual([]);
    expect(Object.keys(exported.meta).sort()).toEqual(["lastBackupAt", "seedVersion", "settings"]);
  });

  it("fusion : ajoute ce qui manque et ignore les doublons d'id et de contenu", async () => {
    const source = await populated();
    const snapshot = await source.exportAll();

    const target = repo();
    const sameContent = await sampleWording({ id: "autre-id" }); // même texte que wording-test-1
    const settings = await target.getSettings();
    await target.saveSettings({ ...settings, accountName: "compte_local" });
    await target.wordings.put(sameContent);
    await target.users.put({ id: "user-test", name: "Nom local", role: "admin" });

    const report = await target.importAll(snapshot, "merge");
    expect(report.skipped.wordings).toBe(1);
    expect(report.added.wordings).toBe(6);
    expect(report.skipped.users).toBe(1);
    expect((await target.users.get("user-test"))?.name).toBe("Nom local");
    expect((await target.getSettings()).accountName).toBe("compte_local");
    expect(await target.wordings.count()).toBe(7);
  });

  it("remplacement d'une base non vide : sauvegarde obligatoire, appelée avant d'écraser", async () => {
    const source = await populated();
    const snapshot = await source.exportAll();

    const target = repo();
    await target.wordings.put(
      await sampleWording({ id: "local-only", text: "Texte local unique" }),
    );

    await expect(target.importAll(snapshot, "replace")).rejects.toBeInstanceOf(BackupRequiredError);
    expect(await target.wordings.get("local-only")).toBeDefined();

    const backup = vi.fn(async (current: Awaited<ReturnType<DexieRepository["exportAll"]>>) => {
      expect(current.tables.wordings.map((w) => w.id)).toEqual(["local-only"]);
    });
    const report = await target.importAll(snapshot, "replace", { backup });
    expect(backup).toHaveBeenCalledOnce();
    expect(report.backupCreated).toBe(true);
    expect(await target.wordings.get("local-only")).toBeUndefined();
    expect(await target.wordings.count()).toBe(7);
  });

  it("un échec de sauvegarde annule le remplacement", async () => {
    const snapshot = await (await populated()).exportAll();
    const target = repo();
    await target.wordings.put(
      await sampleWording({ id: "local-only", text: "Texte local unique" }),
    );
    await expect(
      target.importAll(snapshot, "replace", {
        backup: () => Promise.reject(new Error("disque plein")),
      }),
    ).rejects.toThrow("disque plein");
    expect(await target.wordings.get("local-only")).toBeDefined();
  });
});

describe("migrations", () => {
  it("v1 : aucune migration déclarée", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
    expect(Object.keys(MIGRATIONS)).toEqual([]);
  });

  it("un instantané v1 vide se migre en instantané complet et vide", () => {
    const snapshot = migrateSnapshot({
      app: APP_ID,
      schemaVersion: 1,
      exportedAt: "2026-11-20T14:00:00.000Z",
      tables: {},
    });
    for (const table of TABLE_NAMES) expect(snapshot.tables[table]).toEqual([]);
    expect(snapshot.meta).toEqual({});
  });

  it.each([
    ["autre application", { app: "autre", schemaVersion: 1 }, /ne provient pas/],
    ["version absente", { app: APP_ID }, /Version de schéma/],
    ["version future", { app: APP_ID, schemaVersion: 99 }, /plus récente/],
    ["pas un objet", "texte", /n'est pas un instantané/],
  ])("refuse : %s", (_label, raw, message) => {
    expect(() => migrateSnapshot(raw)).toThrow(message);
  });

  it("signale le premier champ invalide", () => {
    try {
      migrateSnapshot({
        app: APP_ID,
        schemaVersion: 1,
        exportedAt: "2026-11-20T14:00:00.000Z",
        tables: { users: [{ id: "u", name: "", role: "admin" }] },
      });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(SnapshotError);
      expect((error as Error).message).toContain("tables.users.0.name");
    }
  });
});

describe("findForbiddenFields", () => {
  it("trouve les champs clé, jeton et secret à toute profondeur", () => {
    expect(
      findForbiddenFields({ a: { apiKey: "x", list: [{ token: "y" }] }, key: 1, keyword: "ok" }),
    ).toEqual(["$.a.apiKey", "$.a.list[0].token", "$.key"]);
  });
});
