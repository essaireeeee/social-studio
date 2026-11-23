import { expect, test, type Page } from "@playwright/test";
import { resetStorage, waitForReady } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetStorage();
  await page.goto("/editorial");
  await waitForReady(page);
});

/** Nom accessible de l'élément focalisé (libellé ARIA, sinon texte). */
function focused(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null;
    if (!el || el === document.body) return "";
    return (el.getAttribute("aria-label") ?? el.textContent ?? "").replace(/\s+/g, " ").trim();
  });
}

async function tabStops(page: Page, count: number): Promise<string[]> {
  const stops: string[] = [];
  for (let i = 0; i < count; i += 1) {
    await page.keyboard.press("Tab");
    stops.push(await focused(page));
  }
  return stops;
}

test("navigation complète au clavier", async ({ page }) => {
  // Parcours depuis le haut : lien d'évitement, header, barre latérale (écrans disponibles
  // seulement), Session Live.
  await expect(page.getByRole("button", { name: "Démarrer une Session Live" })).toBeVisible();
  const stops = await tabStops(page, 20);
  expect(stops[0]).toBe("Aller au contenu");
  const expected = [
    "HEXAGONE MMA Social Studio : accueil",
    "LIVE SHOW",
    "Rechercher",
    "Moteur : Natif",
    "Paramètres",
    "ADN éditorial",
    "Intelligence artificielle",
    "Replier la barre latérale",
    "Démarrer une Session Live",
  ];
  // Chaque arrêt attendu apparaît, dans cet ordre.
  const positions = expected.map((name) => stops.findIndex((stop) => stop.includes(name)));
  expect(
    positions.every((p) => p >= 0),
    stops.join(" | "),
  ).toBe(true);
  expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  expect(stops.join("|")).not.toMatch(/Combattants|Dashboard|Historique/);
  expect(stops).toEqual(expect.arrayContaining(["Social Studio", "LIVE SHOW"]));

  // Lien d'évitement : le focus passe au contenu.
  await page.reload();
  await waitForReady(page);
  await page.keyboard.press("Tab");
  await page.keyboard.press("Enter");
  expect(await page.evaluate(() => document.activeElement?.id)).toBe("contenu");

  // Sélecteur de mode : flèche droite = DAILY & MEDIA.
  await page.getByRole("radio", { name: /LIVE SHOW/ }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("html")).toHaveAttribute("data-mode", "daily");
  await expect(page.getByRole("radio", { name: /DAILY & MEDIA/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  // Lien de la barre latérale au clavier.
  await page.getByRole("link", { name: "Intelligence artificielle", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/settings\/ai$/);
  await expect(
    page.getByRole("link", { name: "Intelligence artificielle", exact: true }),
  ).toHaveAttribute("aria-current", "page");

  // Les écrans à venir sont annoncés, jamais cliquables.
  const soon = page.getByRole("link", { name: "Combattants (bientôt disponible)" });
  await expect(soon).toHaveAttribute("aria-disabled", "true");
});

test("barre latérale repliable, état mémorisé après actualisation", async ({ page }) => {
  const sidebar = page.locator("#app-sidebar");
  await expect(sidebar).toHaveCSS("width", "232px");
  const toggle = page.getByRole("button", { name: "Replier la barre latérale" });
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(sidebar).toHaveCSS("width", "56px");
  await expect(page.getByRole("button", { name: "Déplier la barre latérale" })).toHaveAttribute(
    "aria-expanded",
    "false",
  );

  await page.reload();
  await waitForReady(page);
  await expect(page.locator("html")).toHaveAttribute("data-sidebar", "collapsed");
  await expect(sidebar).toHaveCSS("width", "56px");

  // Repliée : l'infobulle donne le libellé.
  await page.getByRole("link", { name: "ADN éditorial" }).first().hover();
  await expect(page.getByRole("tooltip")).toHaveText("ADN éditorial");

  await page.getByRole("button", { name: "Déplier la barre latérale" }).click();
  await expect(sidebar).toHaveCSS("width", "232px");
});

test("mode persistant après actualisation, Alt+L / Alt+D", async ({ page }) => {
  await expect(page.locator("html")).toHaveAttribute("data-mode", "live");
  await expect(page.getByRole("region", { name: "Session Live" })).toBeVisible();

  await page.keyboard.press("Alt+KeyD");
  await expect(page.locator("html")).toHaveAttribute("data-mode", "daily");
  await expect(page.getByRole("region", { name: "Session Live" })).toHaveCount(0);

  await page.reload();
  await waitForReady(page);
  await expect(page.locator("html")).toHaveAttribute("data-mode", "daily");
  await expect(page.getByRole("radio", { name: /DAILY & MEDIA/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  const accent = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim(),
  );
  expect(accent.toLowerCase()).toBe("#d97706");

  await page.keyboard.press("Alt+KeyL");
  await expect(page.locator("html")).toHaveAttribute("data-mode", "live");
});

test("Session Live : démarrage, survie à l'actualisation, fin confirmée", async ({ page }) => {
  const bar = page.getByRole("region", { name: "Session Live" });
  await bar.getByRole("button", { name: "Démarrer une Session Live" }).click();
  const dialog = page.getByRole("dialog", { name: "Démarrer une Session Live" });

  // Seul le nom est obligatoire.
  await dialog.getByRole("button", { name: "Démarrer la session" }).click();
  await expect(dialog.getByText("Le nom de l'événement est obligatoire.")).toBeVisible();

  await dialog.getByLabel("Nom de l'événement *").fill("HEXAGONE MMA");
  await dialog.getByLabel("Numéro").fill("12");
  await dialog.getByLabel("Ville").fill("Paris");
  await dialog.getByLabel("Diffusion").fill("RMC SPORT");
  await dialog.getByRole("button", { name: "Démarrer la session" }).click();
  await expect(dialog).toBeHidden();
  await expect(bar).toContainText("ÉVÉNEMENT ACTIF");
  await expect(bar).toContainText("HEXAGONE MMA 12·Paris·Diffusion : RMC SPORT");

  await page.reload();
  await waitForReady(page);
  await expect(bar).toContainText("HEXAGONE MMA 12");

  // Modifier, puis terminer avec confirmation.
  await bar.getByRole("button", { name: "Modifier" }).click();
  const edit = page.getByRole("dialog", { name: "Modifier la Session Live" });
  await expect(edit.getByLabel("Ville")).toHaveValue("Paris");
  await edit.getByLabel("Ville").fill("Lyon");
  await edit.getByRole("button", { name: "Enregistrer" }).click();
  await expect(bar).toContainText("Lyon");

  await bar.getByRole("button", { name: "Terminer" }).click();
  const confirm = page.getByRole("alertdialog", { name: "Terminer la Session Live ?" });
  await confirm.getByRole("button", { name: "Annuler" }).click();
  await expect(bar).toContainText("HEXAGONE MMA 12");
  await bar.getByRole("button", { name: "Terminer" }).click();
  await confirm.getByRole("button", { name: "Terminer la session" }).click();
  await expect(bar).toContainText("Aucune Session Live en cours.");
});

test("palette Ctrl+K : actions et recherche au clavier", async ({ page }) => {
  await page.keyboard.press("Control+KeyK");
  const palette = page.getByRole("dialog", { name: "Rechercher ou lancer une action" });
  await expect(palette).toBeVisible();
  await page.keyboard.type("daily");
  await expect(palette.getByRole("option")).toHaveCount(1);
  await page.keyboard.press("Enter");
  await expect(palette).toBeHidden();
  await expect(page.locator("html")).toHaveAttribute("data-mode", "daily");

  // Recherche dans les wordings : l'exemple fictif garde son badge.
  await page.keyboard.press("Control+KeyK");
  await page.keyboard.type("premier round");
  const option = palette.getByRole("option", { name: /KO AU PREMIER ROUND/ });
  await expect(option).toBeVisible();
  await expect(option).toContainText("Exemple fictif");
  for (let i = 0; i < 10 && (await option.getAttribute("aria-selected")) !== "true"; i += 1) {
    await page.keyboard.press("ArrowDown");
  }
  await page.keyboard.press("Enter");
  const sheet = page.getByRole("dialog", { name: "KO / TKO" });
  await expect(sheet).toContainText("EXEMPLE FICTIF : À REMPLACER PAR UNE PUBLICATION OFFICIELLE");
  await page.keyboard.press("Escape");
  await expect(sheet).toBeHidden();

  // Aucun résultat : message explicite.
  await page.keyboard.press("Control+KeyK");
  await page.keyboard.type("zzzz");
  await expect(palette).toContainText("Aucun résultat pour « zzzz ».");
});
