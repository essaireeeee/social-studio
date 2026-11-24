import { expect, test } from "@playwright/test";
import { EVENT, FIGHTERS, chooseDaily, freshStart, generate, openStudio, seed } from "./steps";

test("4. Annonce de combat en DAILY & MEDIA depuis une fiche événement", async ({ page }) => {
  await freshStart(page);
  await seed(page, "fighters", FIGHTERS);
  await seed(page, "events", [EVENT]);
  await openStudio(page, "daily");
  await chooseDaily(page, "Annonce de combat");
  await page.getByLabel("Combattant A").fill("Karim Fictif");
  await page
    .getByRole("option", { name: /Karim Fictif/ })
    .first()
    .click();
  await page.getByLabel("Combattant B").fill("Tom Essai");
  await page
    .getByRole("option", { name: /Tom Essai/ })
    .first()
    .click();
  await page.getByLabel("Événement", { exact: true }).fill("HEXAGONE MMA 13");
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue("2030-12-14");
  await expect(page.getByLabel("Salle", { exact: true })).toHaveValue("Micropolis");
  await expect(page.getByLabel("Ville", { exact: true })).toHaveValue("Besançon");

  const texts = await generate(page);
  for (const text of texts) {
    expect(text).toContain("Karim Fictif");
    expect(text).toContain("Tom Essai");
    expect(text).not.toContain("21h00"); // horaires non confirmés
  }
  expect(texts[0]).toMatch(/Samedi 14 décembre - Micropolis, Besançon/);
});
