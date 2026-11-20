import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import type { EntityStore } from "@/lib/database/repository";
import { TABLE_NAMES } from "@/lib/database/snapshot";
import { SettingsSchema } from "@/types/domain";
import {
  createTestRepository,
  disposeRepository,
  sampleEntities,
  sampleWording,
} from "../../fixtures/entities";

let repository: DexieRepository;

beforeEach(() => {
  repository = createTestRepository();
});

afterEach(async () => {
  await disposeRepository(repository);
});

describe("DexieRepository : put / get / delete sur chaque entité", () => {
  it.each(TABLE_NAMES)("%s", async (table) => {
    const entity = (await sampleEntities())[table];
    const store = repository[table] as unknown as EntityStore<typeof entity>;

    const stored = await store.put(entity);
    expect(await store.get(entity.id)).toEqual(stored);
    expect(await store.count()).toBe(1);

    await store.delete(entity.id);
    expect(await store.get(entity.id)).toBeUndefined();
    expect(await store.count()).toBe(0);
  });
});

describe("DexieRepository : validation", () => {
  it("refuse une entité invalide sans rien écrire", async () => {
    const wording = await sampleWording();
    await expect(
      repository.wordings.put({ ...wording, mode: "nocturne" as "live" }),
    ).rejects.toThrow();
    expect(await repository.wordings.count()).toBe(0);
  });

  it("retire les champs inconnus avant d'enregistrer", async () => {
    const wording = await sampleWording();
    const stored = await repository.wordings.put({
      ...wording,
      apiKey: "sk-test",
    } as typeof wording);
    expect(stored).not.toHaveProperty("apiKey");
    expect(await repository.wordings.get(wording.id)).not.toHaveProperty("apiKey");
  });

  it("refuse un hashtag mal formé dans un groupe", async () => {
    const { hashtagGroups } = await sampleEntities();
    await expect(
      repository.hashtagGroups.put({ ...hashtagGroups, tags: ["sans dièse"] }),
    ).rejects.toThrow();
  });
});

describe("DexieRepository : bulkPut, list et recherche", () => {
  it("liste par index, trie, pagine et filtre en mémoire", async () => {
    const live = await sampleWording({ id: "w-live", text: "KO éclair #HexagoneMMA" });
    const daily = await sampleWording({
      id: "w-daily",
      mode: "daily",
      categoryId: "daily_ticketing",
      text: "Billetterie ouverte",
      fighterIds: [],
    });
    const demo = await sampleWording({ id: "w-demo", text: "Exemple fictif", isDemo: true });
    await repository.wordings.bulkPut([live, daily, demo]);

    const liveIds = (
      await repository.wordings.list({ where: { index: "mode", equals: "live" } })
    ).map((w) => w.id);
    expect(liveIds.sort()).toEqual(["w-demo", "w-live"]);

    const byFighter = await repository.wordings.list({
      where: { index: "fighterIds", equals: "fighter-test-1" },
    });
    expect(byFighter.map((w) => w.id).sort()).toEqual(["w-demo", "w-live"]);

    const nonDemo = await repository.wordings.list({ filter: (w) => !w.isDemo });
    expect(nonDemo.map((w) => w.id).sort()).toEqual(["w-daily", "w-live"]);

    const page = await repository.wordings.list({ orderBy: "id", offset: 1, limit: 1 });
    expect(page.map((w) => w.id)).toEqual(["w-demo"]);

    const sorted = await repository.wordings.list({
      where: { index: "mode", equals: "live" },
      orderBy: "id",
      reverse: true,
    });
    expect(sorted.map((w) => w.id)).toEqual(["w-live", "w-demo"]);
  });

  it("cherche sans tenir compte des accents, de la casse ni des emojis", async () => {
    await repository.wordings.put(
      await sampleWording({ id: "w1", text: "🔥 Énorme VICTOIRE à Évry" }),
    );
    await repository.wordings.put(await sampleWording({ id: "w2", text: "Billetterie ouverte" }));
    expect((await repository.wordings.search("victoire evry")).map((w) => w.id)).toEqual(["w1"]);
    expect(await repository.wordings.search("   ")).toEqual([]);

    const { fighters } = await sampleEntities();
    await repository.fighters.put(fighters);
    expect(await repository.fighters.search("foudre")).toHaveLength(1);
    expect(await repository.fighters.search("testeur")).toHaveLength(1);
  });
});

describe("DexieRepository : méta, réglages et notifications", () => {
  it("renvoie des réglages complets par défaut, puis ceux enregistrés", async () => {
    const defaults = await repository.getSettings();
    expect(defaults).toEqual(SettingsSchema.parse({}));
    expect(defaults.quickOptions.methods).toEqual(["KO", "TKO", "Soumission", "Décision"]);
    expect(defaults.igTruncation).toBe(125);

    await repository.saveSettings({ ...defaults, igTruncation: 140 });
    expect((await repository.getSettings()).igTruncation).toBe(140);
  });

  it("refuse des réglages hors bornes", async () => {
    const defaults = await repository.getSettings();
    await expect(repository.saveSettings({ ...defaults, igTruncation: 20 })).rejects.toThrow();
  });

  it("signale chaque écriture aux écouteurs", async () => {
    const listener = vi.fn();
    const unsubscribe = repository.onChange(listener);
    const { users } = await sampleEntities();
    await repository.users.put(users);
    await repository.users.delete(users.id);
    await repository.setMeta("lastBackupAt", "2026-11-20T15:00:00.000Z");
    expect(listener).toHaveBeenCalledTimes(3);
    expect(listener.mock.calls[0]?.[0]).toMatchObject({ table: "users", type: "put" });

    unsubscribe();
    await repository.users.put(users);
    expect(listener).toHaveBeenCalledTimes(3);
  });

  it("isEmpty passe à faux dès qu'une donnée existe", async () => {
    expect(await repository.isEmpty()).toBe(true);
    const { fighters } = await sampleEntities();
    await repository.fighters.put(fighters);
    expect(await repository.isEmpty()).toBe(false);
  });
});
