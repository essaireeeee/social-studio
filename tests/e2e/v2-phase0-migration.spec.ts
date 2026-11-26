/**
 * V2-0 dans un vrai navigateur : une base IndexedDB laissée par la V1 s'ouvre en v2
 * sans perte, et un export JSON de la V1 s'importe.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { DEXIE_SCHEMA_V1 } from "../../lib/database/db";
import v1Export from "../fixtures/snapshot-v1.json";
import { resetStorage, waitForReady } from "./helpers";

type Row = Record<string, unknown> & { id: string };
const V1_FILE = path.join(process.cwd(), "tests/fixtures/snapshot-v1.json");
const V1_TABLES = Object.keys(DEXIE_SCHEMA_V1).filter((name) => name !== "meta");
const V2_TABLES = [
  "calendarItems",
  "reminders",
  "campaigns",
  "suggestions",
  "frenchRules",
  "frenchDictionary",
  "frenchIssues",
  "newsSources",
  "newsItems",
  "engagement",
];
const v1Tables = v1Export.tables as unknown as Record<string, Row[]>;

const sorted = (rows: Row[]) => [...rows].sort((a, b) => a.id.localeCompare(b.id));
/** Ce que la V2 doit contenir : les données V1, plus des jalons vides sur les événements. */
const expectedV2 = (table: string) =>
  sorted(v1Tables[table] ?? []).map((row) =>
    table === "events" ? { ...row, milestones: [] } : row,
  );

async function exportJson(page: Page) {
  await page.goto("/settings/data");
  await waitForReady(page);
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export JSON intégral" }).click(),
  ]);
  return JSON.parse(await readFile((await file.path())!, "utf8")) as {
    schemaVersion: number;
    tables: Record<string, Row[]>;
    meta: { settings?: { accountName?: string } };
  };
}

test.beforeEach(async () => {
  await resetStorage();
});

test("une base IndexedDB V1 remplie s'ouvre en v2 sans perte", async ({ page }) => {
  // Page du même domaine qui n'ouvre pas la base : la V1 est écrite avant tout chargement de l'app.
  await page.goto("/api/ai/status");
  const dexie = await readFile(
    path.join(process.cwd(), "node_modules/dexie/dist/dexie.js"),
    "utf8",
  );
  await page.addScriptTag({ content: dexie });
  await page.evaluate(
    async ({ schema, tables, meta }) => {
      const DexieCtor = (window as unknown as { Dexie: new (name: string) => any }).Dexie; // eslint-disable-line @typescript-eslint/no-explicit-any
      const db = new DexieCtor("hexagone-social-studio");
      db.version(1).stores(schema);
      await db.open();
      for (const [name, rows] of Object.entries(tables)) await db.table(name).bulkPut(rows);
      await db
        .table("meta")
        .bulkPut([
          { key: "schemaVersion", value: 1 },
          ...Object.entries(meta).map(([key, value]) => ({ key, value })),
        ]);
      db.close();
    },
    { schema: DEXIE_SCHEMA_V1, tables: v1Export.tables, meta: v1Export.meta },
  );

  await page.goto("/");
  await waitForReady(page);
  await expect(page.getByRole("dialog", { name: /Restaurer/ })).toHaveCount(0);

  const exported = await exportJson(page);
  expect(exported.schemaVersion).toBe(2);
  for (const table of V1_TABLES)
    expect(sorted(exported.tables[table] ?? []), table).toEqual(expectedV2(table));
  for (const table of V2_TABLES) expect(exported.tables[table], table).toEqual([]);
  expect(exported.meta.settings?.accountName).toBe("compte_test");

  // La fiche V1 reste lisible dans l'écran Combattants.
  await page.goto("/fighters");
  await waitForReady(page);
  await expect(page.getByText("Testeur").first()).toBeVisible();
});

test("un export JSON de la V1 s'importe dans la V2", async ({ page }) => {
  await page.goto("/settings/data");
  await waitForReady(page);
  const block = page.getByRole("region", { name: "Importer un export JSON" });
  await block.locator('input[type="file"]').setInputFiles(V1_FILE);
  // Aperçu : les tables V1 sont listées, les tables V2 vides sont masquées.
  await expect(block.getByRole("rowheader", { name: "Combattants" })).toBeVisible();
  await expect(block.getByRole("rowheader", { name: "Campagnes" })).toHaveCount(0);
  await block.getByRole("button", { name: "Fusionner avec les données actuelles" }).click();
  await expect(page.getByText(/Import terminé : \d+ ajoutés/)).toBeVisible();

  const exported = await exportJson(page);
  expect(exported.schemaVersion).toBe(2);
  const ids = (table: string) => new Set((exported.tables[table] ?? []).map((row) => row.id));
  for (const table of V1_TABLES) {
    for (const row of v1Tables[table] ?? [])
      expect(ids(table).has(row.id), `${table} ${row.id}`).toBe(true);
  }
  const event = exported.tables.events?.find((row) => row.id === "event-test-1");
  expect(event?.milestones).toEqual([]);
});
