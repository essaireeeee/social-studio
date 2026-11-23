import { afterEach, describe, expect, it, vi } from "vitest";
import { acceptRestore, declineRestore, prepareData } from "@/lib/database/bootstrap";
import { createDataServices, type DataServices } from "@/lib/database/client";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import { SEED_VERSION, runSeed } from "@/lib/database/seed";
import { countSnapshot, type Snapshot } from "@/lib/database/snapshot";
import {
  createTestRepository,
  disposeRepository,
  fixedNow,
  sampleWording,
} from "../../fixtures/entities";

const repositories: DexieRepository[] = [];

function services(fetchImpl = vi.fn(async () => new Response("{}"))): {
  services: DataServices;
  syncFetch: typeof fetchImpl;
} {
  const repository = createTestRepository();
  repositories.push(repository);
  return {
    services: createDataServices(repository, {
      fetchImpl: fetchImpl as typeof fetch,
      debounceMs: 60_000,
    }),
    syncFetch: fetchImpl,
  };
}

/** Faux serveur de la route restore. */
function restoreRoute(snapshot: Snapshot | null) {
  return vi.fn(async (url: string) => {
    if (!snapshot) return Response.json({ enabled: true, found: false });
    const body: Record<string, unknown> = {
      enabled: true,
      found: true,
      valid: true,
      name: "hexagone-studio.json",
      savedAt: snapshot.exportedAt,
      counts: countSnapshot(snapshot),
    };
    if (url.includes("include=snapshot")) body.snapshot = snapshot;
    return Response.json(body);
  });
}

/** Instantané « réel » : seed + un wording de production. */
async function savedSnapshot(): Promise<Snapshot> {
  const source = createTestRepository();
  repositories.push(source);
  await runSeed(source, fixedNow());
  await source.wordings.put(await sampleWording({ id: "real-1", text: "KO réel #HexagoneMMA" }));
  return source.exportAll();
}

afterEach(async () => {
  for (const repository of repositories.splice(0)) await disposeRepository(repository);
});

describe("démarrage des données", () => {
  it("base vide, aucun fichier : écrit les données initiales", async () => {
    const { services: s } = services();
    const result = await prepareData(s, restoreRoute(null) as unknown as typeof fetch);
    expect(result).toEqual({ kind: "ready" });
    expect(await s.repository.wordings.count()).toBe(6);
  });

  it("premier lancement : moteur initial lu dans AI_PROVIDER (route d'état IA)", async () => {
    const { services: s } = services();
    const route = vi.fn(async (url: string) =>
      url.includes("/api/ai/status")
        ? Response.json({ defaultEngine: "anthropic" })
        : Response.json({ enabled: true, found: false }),
    );
    await prepareData(s, route as unknown as typeof fetch);
    expect((await s.repository.getSettings()).aiProvider).toBe("anthropic");

    const { services: other } = services();
    const invalid = vi.fn(async (url: string) =>
      url.includes("/api/ai/status")
        ? Response.json({ defaultEngine: "gpt" })
        : Response.json({ enabled: true, found: false }),
    );
    await prepareData(other, invalid as unknown as typeof fetch);
    expect((await other.repository.getSettings()).aiProvider).toBe("native");
  });

  it("base vide, fichier trouvé : propose la restauration sans rien écrire", async () => {
    const snapshot = await savedSnapshot();
    const { services: s } = services();
    const result = await prepareData(s, restoreRoute(snapshot) as unknown as typeof fetch);
    expect(result).toEqual({
      kind: "restore-offer",
      offer: {
        name: "hexagone-studio.json",
        savedAt: snapshot.exportedAt,
        counts: countSnapshot(snapshot),
      },
    });
    expect(await s.repository.isEmpty()).toBe(true);
  });

  it("base non vide : prête sans interroger le serveur", async () => {
    const { services: s } = services();
    await runSeed(s.repository, fixedNow());
    const route = restoreRoute(null);
    expect(await prepareData(s, route as unknown as typeof fetch)).toEqual({ kind: "ready" });
    expect(route).not.toHaveBeenCalled();
  });

  it("Restaurer : importe le fichier dans la base vide", async () => {
    const snapshot = await savedSnapshot();
    const { services: s } = services();
    await acceptRestore(s, restoreRoute(snapshot) as unknown as typeof fetch);
    expect(await s.repository.wordings.count()).toBe(7);
    expect(await s.repository.wordings.get("real-1")).toBeDefined();
    expect(await s.repository.getMeta("seedVersion")).toBe(SEED_VERSION);
  });

  it("Ignorer : copie d'abord le fichier existant, puis écrit les données initiales", async () => {
    const snapshot = await savedSnapshot();
    const syncFetch = vi.fn(async () =>
      Response.json({ ok: true, savedAt: "2026-11-20T15:00:00.000Z" }),
    );
    const { services: s } = services(syncFetch);
    await declineRestore(s, restoreRoute(snapshot) as unknown as typeof fetch);

    expect(syncFetch).toHaveBeenCalledOnce();
    const body = JSON.parse(
      (syncFetch.mock.calls[0] as unknown as [string, RequestInit])[1].body as string,
    );
    expect(body.reason).toBe("manual");
    expect(body.snapshot.tables.wordings).toHaveLength(7);

    expect(await s.repository.wordings.count()).toBe(6);
    expect(await s.repository.wordings.get("real-1")).toBeUndefined();
  });
});
