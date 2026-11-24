import { expect, test } from "@playwright/test";
import { freshStart, openStudio } from "./steps";

test("12. Parcours complet sur mobile, par onglets", async ({ page }) => {
  await freshStart(page, { width: 390, height: 844 });
  await openStudio(page, "live");
  const tabs = page.getByRole("tablist", { name: "Étapes du Studio" });
  await expect(tabs.getByRole("tab", { name: "1. Saisie" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await page.getByRole("button", { name: /KO \/ TKO/ }).click();
  await page.getByRole("combobox", { name: /Vainqueur/ }).fill("Karim Fictif");
  await page.getByRole("combobox", { name: /Perdant/ }).fill("Tom Essai");
  await page.getByRole("combobox", { name: /Perdant/ }).press("Escape");
  await page.getByRole("button", { name: /GÉNÉRER LES WORDINGS/ }).click();

  await expect(tabs.getByRole("tab", { name: "2. Résultats" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("article", { name: /Variante/ })).toHaveCount(3);
  await tabs.getByRole("tab", { name: "3. Aperçu" }).click();
  await expect(page.getByTestId("ig-caption")).toContainText("Karim Fictif");
  await expect(page.getByText("Simulation éditoriale : le rendu réel varie selon")).toBeVisible();
  await page.getByRole("button", { name: "Retour à la modification" }).click();
  await expect(tabs.getByRole("tab", { name: "2. Résultats" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
});
