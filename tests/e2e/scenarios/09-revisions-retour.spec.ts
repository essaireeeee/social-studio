import { expect, test } from "@playwright/test";
import { freshStart, openStudio, variantTexts } from "./steps";

test("9. Modification d'une variante, révisions et retour arrière", async ({ page }) => {
  await freshStart(page);
  await openStudio(page, "live");
  await page.keyboard.press("2");
  await page.keyboard.type("Karim Fictif");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Tom Essai");
  await page.keyboard.press("Control+Enter");
  const [original] = await variantTexts(page);

  const card = page.getByRole("article", { name: /Variante 1/ });
  const editor = card.getByRole("textbox").first();
  const versions = card.getByRole("list", { name: "Versions" }).getByRole("button");
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" Quelle soirée.");
  await page.getByRole("heading", { name: "WORDING STUDIO" }).click(); // sortie du champ
  await expect(versions).toHaveCount(2);
  await expect(versions.last()).toHaveAccessibleName(/Édition CM/);
  await expect(card.getByText("Modifiée", { exact: true }).first()).toBeVisible();

  await card.getByRole("button", { name: "Nouvelle accroche" }).click();
  await expect(versions).toHaveCount(3);

  // Retour à la version 1 : une nouvelle révision « Restauration », rien n'est effacé.
  await card.getByRole("button", { name: /Version 1 :/ }).click();
  await expect(versions).toHaveCount(4);
  await expect(versions.last()).toHaveAccessibleName(/Restauration/);
  await expect(editor).toHaveValue(original!);
});
