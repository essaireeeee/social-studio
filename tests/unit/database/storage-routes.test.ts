import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/storage/restore/route";
import { POST } from "@/app/api/storage/snapshot/route";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import { CURRENT_SCHEMA_VERSION } from "@/lib/database/migrations";
import { runSeed } from "@/lib/database/seed";
import { V2_TABLE_NAMES, findForbiddenFields, type Snapshot } from "@/lib/database/snapshot";
import v1Export from "../../fixtures/snapshot-v1.json";
import { createTestRepository, disposeRepository, fixedNow } from "../../fixtures/entities";

let dir: string;
let repository: DexieRepository;
let snapshot: Snapshot;

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/storage/snapshot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: typeof body === "string" ? body : JSON.stringify(body),
    }),
  );
const get = (query = "") => GET(new Request(`http://localhost/api/storage/restore${query}`));

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "hex-routes-"));
  vi.stubEnv("STORAGE_DIR", dir);
  vi.stubEnv("FILE_SYNC_ENABLED", "true");
  repository = createTestRepository();
  await runSeed(repository, fixedNow());
  snapshot = await repository.exportAll();
});

afterEach(async () => {
  vi.unstubAllEnvs();
  await disposeRepository(repository);
  await rm(dir, { recursive: true, force: true });
});

describe("POST /api/storage/snapshot", () => {
  it("crée data/hexagone-studio.json et une sauvegarde, sans champ clé ni jeton", async () => {
    const response = await post({ reason: "auto", snapshot });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.ok).toBe(true);
    expect(body.counts.wordings).toBe(6);

    const main = JSON.parse(await readFile(path.join(dir, "hexagone-studio.json"), "utf8"));
    expect(main.tables.wordings).toHaveLength(6);
    expect(findForbiddenFields(main)).toEqual([]);

    const backups = await readdir(path.join(dir, "backups"));
    expect(backups).toHaveLength(1);
    const backup = JSON.parse(await readFile(path.join(dir, "backups", backups[0]!), "utf8"));
    expect(findForbiddenFields(backup)).toEqual([]);
  });

  it("refuse un instantané contenant un champ de type clé, sans rien écrire", async () => {
    const leaked = structuredClone(snapshot) as Snapshot & { meta: Record<string, unknown> };
    leaked.meta.apiKey = "sk-ant-test";
    const response = await post({ snapshot: leaked });
    expect(response.status).toBe(422);
    expect((await response.json()).paths).toEqual(["$.snapshot.meta.apiKey"]);
    await expect(readdir(dir)).resolves.toEqual([]);
  });

  it("répond 403 quand la synchro est désactivée", async () => {
    vi.stubEnv("FILE_SYNC_ENABLED", "false");
    const response = await post({ snapshot });
    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe("disabled");
  });

  it("répond 413 au-delà de la taille maximale", async () => {
    vi.stubEnv("STORAGE_MAX_BYTES", "200");
    const response = await post({ snapshot });
    expect(response.status).toBe(413);
  });

  it("répond 400 sur un JSON illisible ou un instantané invalide", async () => {
    expect((await post("{pas du json")).status).toBe(400);
    const invalid = await post({ snapshot: { ...snapshot, tables: { wordings: [{ id: "x" }] } } });
    expect(invalid.status).toBe(400);
    expect((await invalid.json()).message).toMatch(/tables\.wordings\.0/);
  });

  it("répond 409 si la page utilise une autre version de schéma", async () => {
    // Onglet V1 resté ouvert après la mise à jour, ou page plus récente que le serveur.
    for (const schemaVersion of [CURRENT_SCHEMA_VERSION - 1, CURRENT_SCHEMA_VERSION + 1]) {
      const response = await post({ snapshot: { ...snapshot, schemaVersion } });
      expect(response.status).toBe(409);
    }
  });

  it("répond 500 sans exposer le corps quand l'écriture échoue", async () => {
    const blocker = path.join(dir, "fichier");
    await writeFile(blocker, "x");
    vi.stubEnv("STORAGE_DIR", path.join(blocker, "sous-dossier"));
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await post({ snapshot });
    expect(response.status).toBe(500);
    expect(JSON.stringify(error.mock.calls)).not.toContain("HEXAGONE MMA");
  });
});

describe("GET /api/storage/restore", () => {
  it("indique l'absence de fichier", async () => {
    expect(await (await get()).json()).toEqual({ enabled: true, found: false });
  });

  it("résume le dernier instantané, et le renvoie sur demande", async () => {
    await post({ snapshot });
    const summary = await (await get()).json();
    expect(summary).toMatchObject({
      enabled: true,
      found: true,
      valid: true,
      source: "main",
      savedAt: snapshot.exportedAt,
      schemaVersion: CURRENT_SCHEMA_VERSION,
    });
    expect(summary.counts.wordings).toBe(6);
    expect(summary.snapshot).toBeUndefined();

    const full = await (await get("?include=snapshot")).json();
    expect(full.snapshot).toEqual(snapshot);
  });

  it("liste les sauvegardes et lit l'une d'elles par son nom", async () => {
    await post({ snapshot });
    const { backups } = await (await get("?list=backups")).json();
    expect(backups).toHaveLength(1);
    const backup = await (await get(`?backup=${backups[0].name}`)).json();
    expect(backup).toMatchObject({ found: true, valid: true, source: "backup" });
    expect((await get("?backup=../hexagone-studio.json")).status).toBe(404);
  });

  it("un fichier local écrit par la V1 est relu et migré en v2", async () => {
    await writeFile(path.join(dir, "hexagone-studio.json"), JSON.stringify(v1Export));
    const full = await (await get("?include=snapshot")).json();
    expect(full).toMatchObject({ found: true, valid: true, schemaVersion: CURRENT_SCHEMA_VERSION });
    expect(full.snapshot.tables.wordings).toHaveLength(v1Export.tables.wordings.length);
    expect(full.snapshot.tables.events[0].milestones).toEqual([]);
    for (const table of V2_TABLE_NAMES) expect(full.snapshot.tables[table]).toEqual([]);
  });

  it("signale un fichier corrompu sans planter", async () => {
    await writeFile(path.join(dir, "hexagone-studio.json"), "{corrompu");
    const response = await get();
    expect(response.status).toBe(422);
    expect(await response.json()).toMatchObject({ found: true, valid: false });
  });

  it("indique que la synchro est désactivée", async () => {
    vi.stubEnv("FILE_SYNC_ENABLED", "false");
    expect(await (await get()).json()).toEqual({ enabled: false, found: false });
  });
});
