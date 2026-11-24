import { expect, test } from "@playwright/test";
import { waitForReady } from "../helpers";
import { freshStart, openStudio, variantTexts } from "./steps";

test("10. Copie et enregistrement d'un wording dans la bibliothèque", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await freshStart(page);
  await openStudio(page, "live");
  await page.keyboard.press("2");
  await page.keyboard.type("Karim Fictif");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Tom Essai");
  await page.keyboard.press("Control+Enter");
  const [text] = await variantTexts(page);

  const card = page.getByRole("article", { name: /Variante 1/ });
  await card.getByRole("button", { name: "Copier" }).click();
  await expect(page.getByText("Copié", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(text);

  await card.getByRole("button", { name: "Enregistrer dans la bibliothèque" }).click();
  const form = page.getByRole("dialog", { name: "Enregistrer dans la bibliothèque" });
  await expect(form.getByLabel("Texte intégral")).toHaveValue(text!);
  await form.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Enregistré dans la bibliothèque")).toBeVisible();

  await page.goto("/library");
  await waitForReady(page);
  await expect(page.getByTestId("library-count")).toHaveText(/^1 publication sur 7/);
  await expect(page.getByRole("list", { name: "Publications de la bibliothèque" })).toContainText(
    "Karim Fictif",
  );
});
