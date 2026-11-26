/**
 * Critères de validation V2-0 : une base V1 remplie migre en v2 sans perte,
 * export v2 puis import v2 identique, import d'un export v1 réussi.
 *
 * `snapshot-v1.json` a été produit par le code V1 (commit phase-12) : seed complet,
 * une entité par table, réglages modifiés. Il ne doit plus être régénéré.
 */
import Dexie from "dexie";
import { afterEach, describe, expect, it } from "vitest";
import { DEXIE_SCHEMA_V1, DEXIE_SCHEMA_V2, DEXIE_VERSION, createDatabase } from "@/lib/database/db";
import { DexieRepository } from "@/lib/database/dexie-repository";
import { CURRENT_SCHEMA_VERSION, MIGRATIONS, migrateSnapshot } from "@/lib/database/migrations";
import type { EntityStore } from "@/lib/database/repository";
import { runSeed } from "@/lib/database/seed";
import { TABLE_NAMES, V2_TABLE_NAMES, countSnapshot } from "@/lib/database/snapshot";
import { HexEventSchema } from "@/types/domain";
import { CalendarItemSchema, CampaignStepSchema, SuggestionSchema } from "@/types/v2";
import v1Export from "../../fixtures/snapshot-v1.json";
import { NOW, disposeRepository, fixedNow, sampleEntities } from "../../fixtures/entities";

type Row = Record<string, unknown> & { id: string };
type V1Tables = Record<string, Row[]>;

const V1_TABLES = Object.keys(DEXIE_SCHEMA_V1).filter((name) => name !== "meta");
const v1Tables = (v1Export as unknown as { tables: V1Tables }).tables;
const v1Meta = (v1Export as unknown as { meta: Record<string, unknown> }).meta;

const repositories: DexieRepository[] = [];
afterEach(async () => {
  await Promise.all(repositories.splice(0).map(disposeRepository));
});

/** Crée une base IndexedDB exactement comme la V1 l'aurait laissée, puis la ferme. */
async function createV1Database(name: string): Promise<void> {
  const v1 = new Dexie(name);
  v1.version(1).stores(DEXIE_SCHEMA_V1);
  await v1.open();
  for (const table of V1_TABLES) await v1.table(table).bulkPut(v1Tables[table] ?? []);
  await v1
    .table("meta")
    .bulkPut([
      { key: "schemaVersion", value: 1 },
      ...Object.entries(v1Meta).map(([key, value]) => ({ key, value })),
    ]);
  v1.close();
}

const byId = (rows: Row[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id));

describe("schéma Dexie v2", () => {
  it("reprend à l'identique toutes les tables V1 et ajoute dix tables", () => {
    for (const [table, indexes] of Object.entries(DEXIE_SCHEMA_V1)) {
      expect(DEXIE_SCHEMA_V2[table as keyof typeof DEXIE_SCHEMA_V2]).toBe(indexes);
    }
    expect(Object.keys(DEXIE_SCHEMA_V2)).toHaveLength(Object.keys(DEXIE_SCHEMA_V1).length + 10);
    expect(V2_TABLE_NAMES.every((name) => name in DEXIE_SCHEMA_V2)).toBe(true);
    expect(DEXIE_VERSION).toBe(2);
  });

  it("aucun index sur un booléen (enabled, allDay, validated…)", () => {
    const booleanFields = ["enabled", "allDay", "titleFight", "validated", "isDemo", "active"];
    for (const indexes of Object.values(DEXIE_SCHEMA_V2)) {
      const names = indexes.split(",").map((part) => part.trim().replace(/^[*&]/, ""));
      for (const field of booleanFields) expect(names).not.toContain(field);
    }
  });
});

describe("migration d'une base V1 remplie", () => {
  it("ouvre la base en v2 sans perdre ni modifier une donnée V1", async () => {
    const name = `test-v1-${crypto.randomUUID()}`;
    await createV1Database(name);

    const repository = new DexieRepository(createDatabase(name), fixedNow);
    repositories.push(repository);
    await repository.db.open();
    expect(repository.db.verno).toBe(2);

    for (const table of V1_TABLES) {
      const stored = byId((await repository.db.table(table).toArray()) as Row[]);
      const expected = byId(v1Tables[table] ?? []).map((row) =>
        table === "events" ? { ...row, milestones: [] } : row,
      );
      expect(stored, table).toEqual(expected);
    }
    for (const table of V2_TABLE_NAMES) {
      expect(await repository.db.table(table).count(), table).toBe(0);
    }

    expect(await repository.getMeta("schemaVersion")).toBe(2);
    expect(await repository.getMeta("seedVersion")).toBe(v1Meta.seedVersion);
    expect((await repository.getSettings()).accountName).toBe("compte_test");
    expect(await repository.getMeta("lastBackupAt")).toBe("2026-11-19T10:00:00.000Z");
  });

  it("les événements migrés restent valides et le seed ne se rejoue pas", async () => {
    const name = `test-v1-${crypto.randomUUID()}`;
    await createV1Database(name);
    const repository = new DexieRepository(createDatabase(name), fixedNow);
    repositories.push(repository);

    for (const event of await repository.events.list()) {
      expect(HexEventSchema.parse(event)).toEqual(event);
    }
    expect(await repository.isEmpty()).toBe(false);
    const before = countSnapshot(await repository.exportAll());
    await runSeed(repository, fixedNow());
    expect(countSnapshot(await repository.exportAll())).toEqual(before);
  });
});

describe("instantanés v2", () => {
  it("v1 → v2 : une seule migration déclarée", () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(2);
    expect(Object.keys(MIGRATIONS)).toEqual(["1"]);
  });

  it("import d'un export V1 réel : réussi, sans perte", async () => {
    const repository = new DexieRepository(createDatabase(`test-${crypto.randomUUID()}`), fixedNow);
    repositories.push(repository);
    const report = await repository.importAll(structuredClone(v1Export), "replace");

    for (const table of V1_TABLES) {
      expect(report.added[table as keyof typeof report.added], table).toBe(
        v1Tables[table]?.length ?? 0,
      );
    }
    for (const table of V2_TABLE_NAMES) expect(report.added[table]).toBe(0);

    const exported = await repository.exportAll();
    expect(exported.schemaVersion).toBe(2);
    for (const table of V1_TABLES) {
      const expected = byId(v1Tables[table] ?? []).map((row) =>
        table === "events" ? { ...row, milestones: [] } : row,
      );
      expect(byId(exported.tables[table as keyof typeof exported.tables] as Row[]), table).toEqual(
        expected,
      );
    }
    expect(exported.meta.settings?.accountName).toBe("compte_test");
    expect(await repository.getMeta("schemaVersion")).toBe(2);
  });

  it("import d'un export V1 en fusion : ajoute sans écraser", async () => {
    const repository = new DexieRepository(createDatabase(`test-${crypto.randomUUID()}`), fixedNow);
    repositories.push(repository);
    await runSeed(repository, fixedNow());
    const report = await repository.importAll(structuredClone(v1Export), "merge");
    expect(report.added.wordings + report.skipped.wordings).toBe(v1Tables.wordings?.length);
    expect(report.added.fighters).toBeGreaterThan(0);
  });

  it("export v2 puis import v2 : identique, tables v2 comprises", async () => {
    const source = new DexieRepository(createDatabase(`test-${crypto.randomUUID()}`), fixedNow);
    repositories.push(source);
    await runSeed(source, fixedNow());
    const entities = await sampleEntities();
    for (const table of TABLE_NAMES) {
      const store = source[table] as unknown as EntityStore<(typeof entities)[typeof table]>;
      await store.put(entities[table]);
    }
    const exported = await source.exportAll();
    for (const table of V2_TABLE_NAMES) expect(exported.tables[table], table).toHaveLength(1);
    expect(exported.tables.events.find((e) => e.id === "event-test-1")?.milestones).toEqual([]);

    const target = new DexieRepository(createDatabase(`test-${crypto.randomUUID()}`), fixedNow);
    repositories.push(target);
    await target.importAll(JSON.parse(JSON.stringify(exported)), "replace");
    expect(await target.exportAll()).toEqual(exported);
  });

  it("les instantanés v1 sans `tables` ou avec des événements incomplets restent lisibles", () => {
    const snapshot = migrateSnapshot({
      app: "hexagone-social-studio",
      schemaVersion: 1,
      exportedAt: NOW,
      tables: { events: [{ ...v1Tables.events?.[0] }] },
    });
    expect(snapshot.schemaVersion).toBe(2);
    expect(snapshot.tables.events[0]?.milestones).toEqual([]);
    for (const table of V2_TABLE_NAMES) expect(snapshot.tables[table]).toEqual([]);
  });
});

describe("règles des nouveaux schémas", () => {
  const base = {
    id: "c1",
    type: "campaign_step" as const,
    title: "Relais de la pesée",
    createdAt: NOW,
    updatedAt: NOW,
  };

  it("un élément « À confirmer » n'a pas de date (règle 1.4)", () => {
    expect(CalendarItemSchema.safeParse({ ...base, status: "to_confirm" }).success).toBe(true);
    const dated = CalendarItemSchema.safeParse({
      ...base,
      status: "to_confirm",
      scheduledAt: "2026-12-01T17:00:00.000Z",
    });
    expect(dated.success).toBe(false);
    expect(
      CalendarItemSchema.safeParse({ ...base, status: "draft", scheduledAt: NOW }).success,
    ).toBe(true);
  });

  it("une suggestion cite toujours au moins une source", () => {
    const suggestion = {
      id: "s1",
      kind: "calendar_gap",
      title: "Rien de prévu mercredi",
      why: "Vous publiez en général 1 post le mercredi.",
      mode: "daily",
      categoryId: "daily_countdown",
      score: 40,
      priority: "low",
      dedupeKey: "calendar_gap:2026-12-02",
      createdAt: NOW,
    };
    expect(SuggestionSchema.safeParse({ ...suggestion, sources: [] }).success).toBe(false);
    expect(
      SuggestionSchema.safeParse({
        ...suggestion,
        sources: [{ type: "calendar", id: "2026-12-02", label: "Mercredi 2 décembre" }],
      }).success,
    ).toBe(true);
  });

  it("une étape de campagne n'accepte qu'une heure HH:mm", () => {
    const step = {
      id: "st1",
      order: 0,
      phase: "fight_week",
      title: "Compte à rebours",
      objective: "Rappeler la date",
      relativeDay: -3,
      mode: "daily",
      categoryId: "daily_countdown",
      angle: "",
    };
    expect(CampaignStepSchema.parse({ ...step, suggestedTime: "18:00" }).status).toBe("proposed");
    expect(CampaignStepSchema.safeParse({ ...step, suggestedTime: "18h" }).success).toBe(false);
  });
});
