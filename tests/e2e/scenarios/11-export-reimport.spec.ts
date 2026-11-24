import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { waitForReady } from "../helpers";
import { FIGHTERS, freshStart, seed } from "./steps";

async function exportJson(page: Page) {
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export JSON intégral" }).click(),
  ]);
  const bytes = await readFile((await file.path())!);
  return { name: file.suggestedFilename(), bytes, json: JSON.parse(bytes.toString("utf8")) };
}

const tables = (snapshot: { tables: Record<string, { id: string }[]> }) =>
  Object.fromEntries(
    Object.entries(snapshot.tables).map(([k, rows]) => [
      k,
      [...rows].sort((a, b) => a.id.localeCompare(b.id)),
    ]),
  );

test("11. Export JSON puis réimport JSON", async ({ page }) => {
  await freshStart(page);
  await seed(page, "fighters", FIGHTERS);
  await page.goto("/settings/data");
  await waitForReady(page);
  const first = await exportJson(page);
  expect(first.json.schemaVersion).toBe(1);

  // Données modifiées : les exemples fictifs sont supprimés.
  await page.getByRole("button", { name: "Supprimer les exemples fictifs" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByTestId("demo-count")).toHaveText("Aucun exemple fictif.");

  // Réimport en fusion : ce qui manque revient, rien n'est dupliqué.
  const block = page.getByRole("region", { name: "Importer un export JSON" });
  await block
    .locator('input[type="file"]')
    .setInputFiles({ name: first.name, mimeType: "application/json", buffer: first.bytes });
  await block.getByRole("button", { name: "Fusionner avec les données actuelles" }).click();
  await expect(page.getByText(/Import terminé : 6 ajoutés/)).toBeVisible();
  await expect(page.getByTestId("demo-count")).toHaveText("6 exemples fictifs");

  const second = await exportJson(page);
  expect(tables(second.json)).toEqual(tables(first.json));
});
