/**
 * V2-1 : shell iOS (sections 5.5 à 5.8 de PROMPT_V2.md) sur iPhone (390 × 844) et desktop.
 */
import { expect, test } from "@playwright/test";
import { resetStorage, waitForReady } from "./helpers";

const IPHONE = { viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true };

test.beforeEach(async () => {
  await resetStorage();
});

test.describe("iPhone", () => {
  test.use(IPHONE);

  test("tab bar à cinq onglets, onglet Plus, retour « ‹ Plus », titre replié", async ({ page }) => {
    await page.goto("/");
    await waitForReady(page);
    const tabs = page.getByRole("navigation", { name: "Onglets" });
    await expect(tabs.getByRole("link")).toHaveText([
      "Accueil",
      "Studio",
      "Calendrier",
      "Idées",
      "Plus",
    ]);
    await expect(tabs.getByRole("link", { name: "Accueil" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    // Calendrier et Idées arrivent en V2-3 et V2-5 : visibles, désactivés.
    await expect(tabs.locator('[aria-disabled="true"]')).toHaveCount(2);
    await expect(page.locator("#app-sidebar")).toBeHidden();

    await tabs.getByRole("link", { name: "Plus" }).click();
    await expect(page).toHaveURL(/\/plus$/);
    await expect(page.getByRole("heading", { name: "Plus", level: 1 })).toBeVisible();
    await page.getByRole("link", { name: "Bibliothèque de wordings" }).click();
    await expect(page).toHaveURL(/\/library$/);
    await waitForReady(page);
    await page.getByRole("link", { name: "Plus", exact: true }).first().click();
    await expect(page).toHaveURL(/\/plus$/);

    // Paramètres > Préférences : retour « ‹ Paramètres », grand titre qui se replie.
    await page.getByRole("link", { name: "Paramètres" }).click();
    await expect(page).toHaveURL(/\/settings$/);
    await page.getByRole("link", { name: /Préférences/ }).click();
    await waitForReady(page);
    await expect(page.getByRole("link", { name: "Paramètres", exact: true })).toBeVisible();
    const barTitle = page.getByRole("banner").getByText("Préférences", { exact: true });
    await expect(barTitle).toHaveCSS("opacity", "0");
    await page.evaluate(() => window.scrollTo(0, 500));
    await expect(barTitle).toHaveCSS("opacity", "1");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(barTitle).toHaveCSS("opacity", "0");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  });

  test("parcours LIVE KO au doigt : 6 interactions au plus, bouton Générer en bas", async ({
    page,
  }) => {
    await page.goto("/studio?mode=live");
    await waitForReady(page);
    const generate = page.getByRole("button", { name: /GÉNÉRER LES WORDINGS/ });
    // Bouton pleine largeur de 52 px, collé au-dessus de la tab bar.
    const box = await generate.boundingBox();
    expect(box!.height).toBe(52);

    let interactions = 0;
    const act = async (fn: () => Promise<void>) => {
      interactions += 1;
      await fn();
    };
    await act(() => page.getByRole("button", { name: /KO \/ TKO/ }).tap());
    await act(() => page.keyboard.type("Karim Fictif")); // vainqueur, focus automatique
    // Clavier ouvert : la tab bar se masque.
    await expect(page.getByRole("navigation", { name: "Onglets" })).toBeHidden();
    // Flèche « suivant » du clavier iOS (Tab) : la liste de suggestions recouvre le champ.
    await act(() => page.keyboard.press("Tab"));
    await act(() => page.keyboard.type("Tom Essai"));
    await act(() => generate.tap());

    await expect(page.getByRole("article", { name: /Variante/ })).toHaveCount(3);
    expect(interactions).toBeLessThanOrEqual(6);
    await expect(
      page.getByRole("tablist", { name: "Étapes du Studio" }).getByRole("tab", {
        name: "2. Résultats",
      }),
    ).toHaveAttribute("aria-selected", "true");
  });

  test("feuille (sheet) qui monte du bas, ActionSheet pour supprimer", async ({ page }) => {
    await page.goto("/settings/users");
    await waitForReady(page);
    await page.getByRole("button", { name: "Nouveau profil" }).click();
    const sheet = page.getByRole("dialog", { name: /profil/i });
    await expect(sheet).toBeVisible();
    // Ancrée en bas de l'écran, sur toute la largeur (une fois l'animation terminée).
    await expect
      .poll(async () => {
        const box = (await sheet.boundingBox())!;
        return [Math.round(box.x), Math.round(box.width), Math.round(box.y + box.height)];
      })
      .toEqual([0, 390, 844]);
    await sheet.getByLabel("Nom").fill("Profil à supprimer");
    await sheet.getByRole("button", { name: "Enregistrer" }).click();
    await expect(sheet).toBeHidden();

    const row = page.getByRole("listitem", { name: "Profil à supprimer" });
    await row.getByRole("button", { name: /Supprimer/ }).click();
    const actions = page.getByRole("alertdialog");
    await expect(actions.getByRole("button", { name: "Annuler" })).toBeVisible();
    const destructive = actions.getByRole("button", { name: "Supprimer", exact: true });
    await expect(destructive).toHaveCSS("color", "rgb(199, 0, 20)");
    await destructive.click();
    await expect(page.getByRole("listitem", { name: "Profil à supprimer" })).toHaveCount(0);
  });
});

test("desktop : barre de navigation translucide, Paramètres en listes groupées", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/settings");
  await waitForReady(page);
  const bar = page.getByRole("banner");
  await expect(bar).toHaveCSS("backdrop-filter", /blur\(20px\)/);
  await expect(page.getByRole("navigation", { name: "Onglets" })).toBeHidden();
  const group = page.getByRole("region", { name: "Application" });
  for (const name of [
    "Intelligence artificielle",
    "Préférences",
    "Gestion des données",
    "Utilisateurs",
  ]) {
    await expect(group.getByRole("link", { name: new RegExp(name) })).toBeVisible();
  }
  await group.getByRole("link", { name: /Préférences/ }).click();
  await expect(page).toHaveURL(/\/settings\/preferences$/);
  await expect(page.getByRole("link", { name: "Paramètres", exact: true }).first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Installer sur l'écran d'accueil" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Utiliser l'app sur iPhone" })).toBeVisible();

  // Manifeste de l'application installable.
  const manifest = await (await page.request.get("/manifest.webmanifest")).json();
  expect(manifest).toMatchObject({ display: "standalone", short_name: "Social Studio" });
  expect(manifest.icons.map((i: { sizes: string }) => i.sizes)).toEqual(
    expect.arrayContaining(["192x192", "512x512"]),
  );
  expect((await page.request.get("/icons/apple-touch-icon.png")).ok()).toBe(true);
  expect((await page.request.get("/sw.js")).headers()["cache-control"]).toContain("no-cache");
});
