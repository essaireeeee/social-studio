import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { freshStart } from "./steps";
import { waitForReady } from "../helpers";

test("6. Import de 20 wordings collés avec 2 doublons", async ({ page }) => {
  await freshStart(page);
  await page.goto("/library");
  await waitForReady(page);
  await page.getByRole("button", { name: "Importer" }).click();
  await page.getByRole("menuitem", { name: "Coller plusieurs publications" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Publications à importer" })
    .fill(readFileSync(path.join(process.cwd(), "tests/fixtures/import/paste-20.txt"), "utf8"));
  await expect(dialog.getByTestId("bulk-count")).toHaveText("20 publications détectées");
  await dialog.getByRole("button", { name: "Vérifier" }).click();
  await expect(dialog).toContainText("20 publications détectées · 2 doublons · 0 à catégoriser");
  await dialog.getByRole("button", { name: /Continuer/ }).click();
  await dialog.getByRole("button", { name: "Importer 18 publications" }).click();
  await expect(page.getByTestId("library-count")).toHaveText(/^18 publications sur 24/);
});
