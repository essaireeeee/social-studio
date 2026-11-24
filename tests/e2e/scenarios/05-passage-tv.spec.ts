import { expect, test } from "@playwright/test";
import { chooseDaily, freshStart, generate, openStudio } from "./steps";

test("5. Passage TV : présence médiatique", async ({ page }) => {
  await freshStart(page);
  await openStudio(page, "daily");
  await chooseDaily(page, "Passage TV");
  await page.getByLabel("Personne").fill("Samba Sima");
  await page
    .getByRole("option", { name: /Samba Sima/ })
    .first()
    .click();
  await page.getByRole("textbox", { name: "Média requis", exact: true }).fill("Chaîne Test");
  await page.getByLabel("Date de diffusion").fill("2030-12-10");
  const texts = await generate(page);
  for (const text of texts) {
    expect(text).toContain("Samba Sima");
    expect(text).toContain("Chaîne Test");
  }
  expect(texts.join("\n")).toMatch(/10 décembre/i);
});
