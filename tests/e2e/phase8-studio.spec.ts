import { expect, test, type Page } from "@playwright/test";
import { resetStorage, waitForReady } from "./helpers";

test.beforeEach(async () => {
  await resetStorage();
});

async function openStudio(page: Page) {
  await page.goto("/studio");
  await waitForReady(page);
  await expect(page.getByRole("button", { name: /GÉNÉRER LES WORDINGS/ })).toBeVisible();
}

/** Parcours LIVE KO : chaque appel compte pour une interaction du CM. */
async function liveKo(page: Page): Promise<number> {
  await page.keyboard.press("2"); // 1. catégorie KO / TKO (raccourci)
  await page.keyboard.type("Karim Fictif"); // 2. vainqueur (focus placé automatiquement)
  await page.keyboard.press("Tab"); // 3. champ suivant
  await page.keyboard.type("Tom Essai"); // 4. perdant
  const started = Date.now();
  await page.keyboard.press("Control+Enter"); // 5. générer
  await expect(page.getByRole("article", { name: /Variante 1/ })).toBeVisible();
  return Date.now() - started;
}

test("parcours LIVE KO : 6 interactions au plus, génération native en moins de 1 s", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStudio(page);
  const duration = await liveKo(page);
  expect(duration).toBeLessThan(1000);

  const cards = page.getByRole("article", { name: /Variante/ });
  await expect(cards).toHaveCount(3);
  await expect(cards.first()).toHaveAccessibleName("Variante 1 : Signature HEXAGONE");
  await expect(cards.first()).toContainText("Recommandée");
  for (const card of await cards.all()) await expect(card).toContainText("Karim Fictif");
  await expect(page.getByText("Simulation éditoriale : le rendu réel varie selon")).toBeVisible();
});

test("1 440 px : trois colonnes, chacune avec son propre défilement", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStudio(page);
  await liveKo(page);

  const brief = page.getByRole("tabpanel", { name: "Brief" });
  const wording = page.getByRole("tabpanel", { name: "Wording Studio" });
  const preview = page.getByRole("tabpanel", { name: "Aperçu" });
  for (const column of [brief, wording, preview]) {
    await expect(column).toBeVisible();
    await expect(column).toHaveCSS("overflow-y", "auto");
  }
  const boxes = await Promise.all([brief, wording, preview].map((c) => c.boundingBox()));
  expect(boxes[0]!.x).toBeLessThan(boxes[1]!.x);
  expect(boxes[1]!.x).toBeLessThan(boxes[2]!.x);

  // Le Wording Studio défile seul : ni la page ni les autres colonnes ne bougent.
  expect(await wording.evaluate((el) => el.scrollHeight > el.clientHeight)).toBe(true);
  await wording.evaluate((el) => el.scrollTo(0, 400));
  expect(await wording.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  expect(await brief.evaluate((el) => el.scrollTop)).toBe(0);
  expect(await preview.evaluate((el) => el.scrollTop)).toBe(0);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

test("390 × 844 : des onglets remplacent les colonnes, bascule sur Résultats", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openStudio(page);
  const tabs = page.getByRole("tablist", { name: "Étapes du Studio" });
  await expect(tabs.getByRole("tab")).toHaveText(["1. Saisie", "2. Résultats", "3. Aperçu"]);
  await expect(page.getByRole("tabpanel", { name: "Brief" })).toBeVisible();
  await expect(page.getByRole("tabpanel", { name: "Wording Studio" })).toBeHidden();
  await expect(page.getByRole("tabpanel", { name: "Aperçu" })).toBeHidden();

  // Bouton Générer collant en bas, pleine largeur, au moins 52 px.
  const generate = page.getByRole("button", { name: /GÉNÉRER LES WORDINGS/ });
  const box = (await generate.boundingBox())!;
  expect(box.height).toBeGreaterThanOrEqual(52);
  expect(box.y + box.height).toBeLessThanOrEqual(844);

  await liveKo(page);
  await expect(tabs.getByRole("tab", { name: "2. Résultats" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await expect(page.getByRole("tabpanel", { name: "Brief" })).toBeHidden();
  await tabs.getByRole("tab", { name: "3. Aperçu" }).click();
  await expect(page.getByTestId("ig-caption")).toContainText("Karim Fictif");
});

test("édition : aperçu en temps réel, coupure au seuil réglé", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStudio(page);
  await liveKo(page);

  const editor = page.getByRole("textbox", { name: "Texte de la variante Signature HEXAGONE" });
  await editor.click();
  await page.keyboard.press("Control+Home");
  await page.keyboard.type("CE SOIR ");
  await expect(page.getByTestId("ig-caption")).toContainText("CE SOIR");

  // Seuil réglé à 60 : la partie visible ne dépasse jamais 60 caractères.
  const slider = page.getByRole("slider");
  await slider.focus();
  await slider.press("Home");
  await expect(page.getByTestId("ig-indicator")).toContainText("/ 60 caractères");
  const visible = Number(
    (await page.getByTestId("ig-indicator").innerText()).match(/: (\d+) \//)![1],
  );
  expect(visible).toBeLessThanOrEqual(60);

  await page.getByRole("switch", { name: /partie visible avant PLUS/ }).check();
  await expect(page.getByRole("button", { name: "… plus" })).toBeDisabled();
});

test("versions, validation et brouillon conservés après actualisation", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStudio(page);
  await liveKo(page);
  const card = page.getByRole("article", { name: /Variante 1/ });
  const versions = card.getByRole("list", { name: "Versions" }).getByRole("button");

  await card.getByRole("button", { name: "Nouvelle accroche" }).click();
  await expect(versions).toHaveCount(2);
  await card.getByRole("button", { name: /Version 1 :/ }).click();
  await expect(versions).toHaveCount(3);
  await expect(versions.last()).toHaveAccessibleName(/Restauration/);

  await card.getByRole("button", { name: "Valider" }).click();
  await expect(card.getByText("Validée", { exact: true }).first()).toBeVisible();

  await page.reload();
  await waitForReady(page);
  await expect(page.getByRole("button", { name: /KO \/ TKO/ })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.getByLabel("Vainqueur")).toHaveValue("Karim Fictif");
  const restored = page.getByRole("article", { name: /Variante 1/ });
  await expect(restored.getByRole("list", { name: "Versions" }).getByRole("button")).toHaveCount(3);
  await expect(restored.getByText("Validée", { exact: true }).first()).toBeVisible();
});

test("brief incomplet : message précis sous le champ, focus dessus", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await openStudio(page);
  await page.keyboard.press("2");
  await page.keyboard.type("Karim Fictif");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByText("Perdant : champ requis.")).toBeVisible();
  await expect(page.getByLabel("Perdant")).toBeFocused();
  await expect(page.getByRole("article", { name: /Variante/ })).toHaveCount(0);
});
