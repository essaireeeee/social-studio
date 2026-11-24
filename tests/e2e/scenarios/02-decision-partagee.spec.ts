import { expect, test } from "@playwright/test";
import { freshStart, generate, openStudio } from "./steps";

test("2. Victoire par décision partagée", async ({ page }) => {
  await freshStart(page);
  await openStudio(page, "live");
  await page.keyboard.press("4"); // Décision
  await page.keyboard.type("Karim Fictif");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Tom Essai");
  await page.keyboard.press("Tab"); // referme les suggestions
  await page.getByRole("button", { name: "Partagée", exact: true }).click();
  const texts = await generate(page);
  expect(texts.join("\n")).toMatch(/décision partagée/i);
  for (const text of texts) expect(text).toContain("Karim Fictif");
});
