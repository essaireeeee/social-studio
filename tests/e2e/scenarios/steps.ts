/** Étapes partagées des scénarios de recette (section 17.2). */
import { expect, type Page } from "@playwright/test";
import { idbPut, resetStorage, waitForReady } from "../helpers";

export const NOW = new Date().toISOString();

export const FIGHTERS = [
  { id: "f-karim", firstName: "Karim", lastName: "Fictif", fightHistory: [], updatedAt: NOW },
  { id: "f-tom", firstName: "Tom", lastName: "Essai", fightHistory: [], updatedAt: NOW },
];

export const EVENT = {
  id: "ev13",
  name: "HEXAGONE MMA",
  number: 13,
  date: "2030-12-14",
  city: "Besançon",
  venue: "Micropolis",
  links: [],
  broadcasters: [
    { name: "Chaîne Test", channel: "Chaîne Test", startTime: "21h00", scope: "main_card" },
  ],
  confirmedSchedule: false,
  fightCard: [],
  milestones: [],
  updatedAt: NOW,
};

/** Point de départ : sauvegarde vide, données du premier lancement, écran large. */
export async function freshStart(page: Page, size = { width: 1440, height: 900 }): Promise<void> {
  await resetStorage();
  await page.setViewportSize(size);
  await page.goto("/");
  await waitForReady(page);
}

export async function seed(page: Page, store: string, records: unknown[]): Promise<void> {
  await idbPut(page, store, records);
}

export async function openStudio(page: Page, mode: "live" | "daily" = "live"): Promise<void> {
  await page.goto(mode === "daily" ? "/studio?mode=daily" : "/studio?mode=live");
  await waitForReady(page);
  await expect(page.locator("html")).toHaveAttribute("data-mode", mode);
  await expect(page.getByRole("button", { name: /GÉNÉRER LES WORDINGS/ })).toBeVisible();
  // Studio prêt : les catégories du mode sont affichées.
  await expect(
    mode === "live"
      ? page.getByRole("button", { name: /KO \/ TKO/ })
      : page.getByLabel("Rechercher une catégorie"),
  ).toBeVisible();
}

/** Session Live démarrée depuis la barre (hors décompte des interactions du parcours). */
export async function startSession(page: Page): Promise<void> {
  const bar = page.getByRole("region", { name: "Session Live" });
  await bar.getByRole("button", { name: "Démarrer une Session Live" }).click();
  const dialog = page.getByRole("dialog", { name: "Démarrer une Session Live" });
  await dialog.getByLabel("Nom de l'événement *").fill("HEXAGONE MMA");
  await dialog.getByLabel("Numéro").fill("12");
  await dialog.getByLabel("Ville").fill("Paris");
  await dialog.getByLabel("Diffusion").fill("RMC SPORT");
  await dialog.getByRole("button", { name: "Démarrer la session" }).click();
  await expect(bar).toContainText("ÉVÉNEMENT ACTIF");
}

/** Catégorie DAILY & MEDIA par la recherche du sélecteur. */
export async function chooseDaily(page: Page, label: string): Promise<void> {
  await page.getByLabel("Rechercher une catégorie").fill(label);
  await page.getByRole("button", { name: new RegExp(label) }).click();
}

export const variants = (page: Page) => page.getByRole("article", { name: /Variante/ });

/** Textes des trois variantes, une fois affichées. */
export async function variantTexts(page: Page): Promise<string[]> {
  await expect(variants(page)).toHaveCount(3);
  return Promise.all(
    (await variants(page).all()).map((card) => card.getByRole("textbox").first().inputValue()),
  );
}

export async function generate(page: Page): Promise<string[]> {
  await page.getByRole("button", { name: /GÉNÉRER LES WORDINGS/ }).click();
  return variantTexts(page);
}
