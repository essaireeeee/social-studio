import { expect, test } from "@playwright/test";
import { freshStart, openStudio, startSession, variantTexts } from "./steps";

test("1. KO en LIVE SHOW avec Session Live active : 6 interactions au plus", async ({ page }) => {
  await freshStart(page);
  await openStudio(page, "live");
  await startSession(page);
  await expect(
    page.getByText("Contexte de la Session Live : HEXAGONE MMA 12 · Paris"),
  ).toBeHidden();

  const started = Date.now();
  let interactions = 0;
  const act = async (fn: () => Promise<void>) => {
    interactions += 1;
    await fn();
  };
  await act(() => page.keyboard.press("2")); // catégorie KO / TKO
  await act(() => page.keyboard.type("Karim Fictif")); // vainqueur, focus automatique
  await act(() => page.keyboard.press("Tab"));
  await act(() => page.keyboard.type("Tom Essai")); // perdant
  await act(() => page.keyboard.press("Control+Enter")); // générer

  const texts = await variantTexts(page);
  expect(interactions).toBeLessThanOrEqual(6);
  // Annexe B : un post de KO prêt en moins de 30 secondes, session comprise.
  expect(Date.now() - started).toBeLessThan(30_000);
  await expect(
    page.getByText("Contexte de la Session Live : HEXAGONE MMA 12 · Paris"),
  ).toBeVisible();
  for (const text of texts) {
    expect(text).toContain("Karim Fictif");
    expect(text).not.toMatch(/\d{1,2}h\d{0,2}/); // aucun horaire inventé
  }
  await expect(page.getByText("Simulation éditoriale : le rendu réel varie selon")).toBeVisible();
});
