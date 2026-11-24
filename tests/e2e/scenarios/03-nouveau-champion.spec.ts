import { expect, test } from "@playwright/test";
import { freshStart, generate, openStudio } from "./steps";

test("3. Nouveau champion : « la ceinture d'HEXAGONE MMA »", async ({ page }) => {
  await freshStart(page);
  await openStudio(page, "live");
  await page.keyboard.press("8"); // Nouveau champion
  await page.keyboard.type("Karim Fictif");
  await page.getByLabel("Catégorie de poids").fill("Poids légers");
  const texts = await generate(page);
  expect(texts.join("\n")).toContain("la ceinture d'HEXAGONE MMA");
  for (const text of texts) {
    expect(text).toContain("Karim Fictif");
    expect(text).not.toMatch(/ceinture de HEXAGONE/);
  }
});
