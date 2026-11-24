import { expect, test } from "@playwright/test";
import { freshStart, openStudio, variantTexts } from "./steps";

const DATE =
  /\b\d{1,2}(er)? (janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\b|\b\d{1,2}\/\d{1,2}\b/i;

test("14. Contraintes éditoriales : « de HEXAGONE MMA », Samba Sima, aucune date inventée", async ({
  page,
}) => {
  await freshStart(page);
  await openStudio(page, "live");
  await page.keyboard.press("2");
  await page.keyboard.type("Samba Sima");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Tom Essai");
  await page.keyboard.press("Control+Enter");
  const texts = await variantTexts(page);
  for (const text of texts) {
    expect(text).toMatch(/crack|phénomène/); // contexte positif
    expect(text).not.toMatch(DATE); // aucune date dans le brief : aucune dans le texte
    expect(text).not.toMatch(/d'HEXAGONE MMA/);
  }

  // Une saisie « d'HEXAGONE MMA » est corrigée à la sortie du champ.
  const editor = page
    .getByRole("article", { name: /Variante 1/ })
    .getByRole("textbox")
    .first();
  await editor.fill("Quelle soirée d'HEXAGONE MMA !");
  await page.getByRole("heading", { name: "WORDING STUDIO" }).click();
  await expect(editor).toHaveValue(/de HEXAGONE MMA/);
  await expect(editor).not.toHaveValue(/d'HEXAGONE MMA/);
});
