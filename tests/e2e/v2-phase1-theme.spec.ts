/**
 * V2-1 : thèmes Jour / Nuit / Automatique (section 5.1 de PROMPT_V2.md).
 * Remplace le test V1 du thème « OCTOGON DARK », remplacé par le thème Nuit.
 */
import { expect, test, type Page } from "@playwright/test";
import { resetStorage, waitForReady } from "./helpers";

test.beforeEach(async () => {
  await resetStorage();
});

const colors = (page: Page) =>
  page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return {
      theme: document.documentElement.dataset.theme,
      background: getComputedStyle(document.body).backgroundColor,
      text: getComputedStyle(document.body).color,
      accent: root.getPropertyValue("--accent").trim().toLowerCase(),
      font: getComputedStyle(document.body).fontFamily,
      meta: [...document.querySelectorAll('meta[name="theme-color"]')].map((m) =>
        m.getAttribute("content"),
      ),
    };
  });

test("Automatique par défaut : suit le système, jour puis nuit", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/");
  await waitForReady(page);
  const light = await colors(page);
  expect(light.theme).toBe("light");
  expect(light.background).toBe("rgb(242, 242, 247)");
  expect(light.text).toBe("rgb(0, 0, 0)");
  expect(light.accent).toBe("#e11d48");
  // Pile système, Inter servie localement hors appareils Apple.
  expect(light.font).toContain("-apple-system");
  expect(light.font.toLowerCase()).toContain("inter");
  expect(new Set(light.meta)).toEqual(new Set(["#F2F2F7"]));

  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  // Fondu de 200 ms sur le fond : on attend la fin de la transition.
  await expect.poll(async () => (await colors(page)).background).toBe("rgb(0, 0, 0)");
  const dark = await colors(page);
  expect(dark.text).toBe("rgb(255, 255, 255)");
  expect(dark.accent).toBe("#f43f5e");
  await expect.poll(async () => (await colors(page)).meta[0]).toBe("#000000");

  // Le mode reste indépendant du thème.
  await page.keyboard.press("Alt+KeyD");
  await expect(page.locator("html")).toHaveAttribute("data-mode", "daily");
  expect((await colors(page)).accent).toBe("#f59e0b");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("aucun flash au rechargement : data-theme est posé avant le premier rendu", async ({
  page,
}) => {
  await page.emulateMedia({ colorScheme: "light" });
  // Au moment où <body> est inséré (avant toute peinture), on relève le thème posé.
  await page.addInitScript(() => {
    const seen: (string | undefined)[] = [];
    (window as unknown as { __themeAtBody: typeof seen }).__themeAtBody = seen;
    new MutationObserver((_, observer) => {
      if (document.body) {
        seen.push(document.documentElement.dataset.theme);
        observer.disconnect();
      }
    }).observe(document, { childList: true, subtree: true });
  });
  await page.goto("/settings/preferences");
  await waitForReady(page);
  await page.getByRole("radio", { name: "Nuit" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  for (const path of ["/settings/preferences", "/", "/studio"]) {
    await page.goto(path);
    const atBody = await page.evaluate(
      () => (window as unknown as { __themeAtBody: string[] }).__themeAtBody,
    );
    expect(atBody, path).toEqual(["dark"]);
    await waitForReady(page);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  }
});

test("bouton soleil / lune et Préférences > Apparence", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/settings/preferences");
  await waitForReady(page);
  const appearance = page.getByRole("radiogroup", { name: "Thème" });
  await expect(appearance.getByRole("radio", { name: "Automatique" })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  // Bouton rapide de la barre de navigation.
  await page.getByRole("button", { name: "Passer en thème Nuit" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(appearance.getByRole("radio", { name: "Nuit" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect.poll(async () => (await colors(page)).meta[0]).toBe("#000000");
  await page.reload();
  await waitForReady(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");

  await page.getByRole("button", { name: "Passer en thème Jour" }).click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  // Retour à Automatique : le système reprend la main.
  await appearance.getByRole("radio", { name: "Automatique" }).click();
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});

test("l'aperçu des réseaux a son propre interrupteur clair / sombre", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "light" });
  await page.goto("/studio?mode=live");
  await waitForReady(page);
  await expect(page.locator("html")).toHaveAttribute("data-mode", "live");
  await expect(page.getByRole("button", { name: /GÉNÉRER LES WORDINGS/ })).toBeVisible();
  await page.keyboard.press("2");
  await page.keyboard.type("Karim Fictif");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Tom Essai");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByRole("article", { name: /Variante 1/ })).toBeVisible();

  const frame = page.locator("[data-preview-theme]");
  await expect(frame).toHaveAttribute("data-preview-theme", "dark");
  await page.getByRole("radio", { name: "Réseau en clair" }).click();
  await expect(frame).toHaveAttribute("data-preview-theme", "light");
  // Le thème de l'application ne bouge pas.
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.reload();
  await waitForReady(page);
  await expect(page.getByRole("radio", { name: "Réseau en clair" })).toHaveAttribute(
    "aria-checked",
    "true",
  );
});
