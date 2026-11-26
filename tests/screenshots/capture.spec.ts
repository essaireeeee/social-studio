/**
 * Captures des écrans principaux : iPhone (390 × 844, densité 2) et desktop (1440 × 900),
 * thèmes Jour et Nuit, modes LIVE SHOW et DAILY & MEDIA. Fichiers : tests/screenshots/*.png.
 * Le Calendrier arrive en phase V2-3 : ses captures seront ajoutées avec lui.
 */
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { resetStorage, waitForReady } from "../e2e/helpers";

const SIZES = {
  iphone: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
  desktop: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 },
} as const;
const THEMES = ["light", "dark"] as const;
const MODES = ["live", "daily"] as const;
const OUT = path.join(process.cwd(), "tests/screenshots");

async function settle(page: Page) {
  await waitForReady(page);
  // Transitions de page et fondus terminés.
  await page.waitForTimeout(600);
}

async function studio(page: Page, mode: (typeof MODES)[number]) {
  await page.goto(`/studio?mode=${mode}`);
  await waitForReady(page);
  await expect(page.locator("html")).toHaveAttribute("data-mode", mode);
  await expect(page.getByRole("button", { name: /GÉNÉRER LES WORDINGS/ })).toBeVisible();
  if (mode === "live") {
    await page.getByRole("button", { name: /KO \/ TKO/ }).click();
    await page.keyboard.type("Karim Fictif");
    await page.keyboard.press("Tab");
    await page.keyboard.type("Tom Essai");
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: /GÉNÉRER LES WORDINGS/ }).click();
    await expect(page.getByRole("article", { name: /Variante 1/ })).toBeVisible();
  }
}

for (const [size, device] of Object.entries(SIZES)) {
  for (const theme of THEMES) {
    for (const mode of MODES) {
      test(`${size} · ${theme} · ${mode}`, async ({ browser }) => {
        await resetStorage();
        const context = await browser.newContext({ ...device, colorScheme: theme });
        await context.addInitScript(
          ([t, m]) => {
            localStorage.setItem("hex-theme", t);
            localStorage.setItem("hex-mode", m);
          },
          [theme, mode],
        );
        const page = await context.newPage();
        const shot = (screen: string) =>
          page.screenshot({ path: path.join(OUT, `${screen}-${size}-${theme}-${mode}.png`) });

        await page.goto("/");
        await settle(page);
        await shot("accueil");

        await studio(page, mode);
        await settle(page);
        await shot("studio");

        await page.goto("/library");
        await settle(page);
        const demos = page.getByRole("button", { name: "Afficher les exemples fictifs" });
        if (await demos.isVisible()) await demos.click();
        await page.waitForTimeout(300);
        await shot("bibliotheque");

        await page.goto("/settings");
        await settle(page);
        await shot("parametres");
        await context.close();
      });
    }
  }
}
