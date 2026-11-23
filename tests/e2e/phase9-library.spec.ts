import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { createWording } from "@/lib/database/wording-factory";
import { idbPut, resetStorage, waitForReady } from "./helpers";

const FIXTURES = path.join(process.cwd(), "tests/fixtures/import");

test.beforeEach(async ({ page }) => {
  await resetStorage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/library");
  await waitForReady(page);
});

async function openImport(page: Page, item: string) {
  await page.getByRole("button", { name: "Importer" }).click();
  await page.getByRole("menuitem", { name: item }).click();
  return page.getByRole("dialog");
}

const count = (page: Page) => page.getByTestId("library-count");

test("collage de 20 publications : 20 détectées, catégories proposées, 2 doublons", async ({
  page,
}) => {
  const dialog = await openImport(page, "Coller plusieurs publications");
  await dialog
    .getByRole("textbox", { name: "Publications à importer" })
    .fill(readFileSync(path.join(FIXTURES, "paste-20.txt"), "utf8"));
  await expect(dialog.getByTestId("bulk-count")).toHaveText("20 publications détectées");
  await dialog.getByRole("button", { name: "Vérifier" }).click();

  await expect(dialog).toContainText("20 publications détectées · 2 doublons · 0 à catégoriser");
  await expect(dialog.getByRole("row")).toHaveCount(21);
  await expect(
    dialog.getByRole("combobox", { name: "Catégorie de la ligne 1", exact: true }),
  ).toHaveValue("live_ko");
  await expect(
    dialog.getByRole("combobox", { name: "Catégorie de la ligne 14", exact: true }),
  ).toHaveValue("media_interview");
  await expect(dialog.getByText("Doublon exact (ligne 3)")).toBeVisible();
  await expect(dialog.getByText(/Très proche de « .* » \(ligne 8\)/)).toBeVisible();
  await expect(
    dialog.getByRole("checkbox", { name: "Importer la ligne 19", exact: true }),
  ).not.toBeChecked();
  await expect(
    dialog.getByRole("checkbox", { name: "Importer la ligne 20", exact: true }),
  ).not.toBeChecked();

  // Action groupée : la plateforme s'applique aux lignes cochées seulement.
  await dialog
    .getByRole("combobox", { name: "Appliquer une plateforme à la sélection" })
    .selectOption("facebook");
  await expect(
    dialog.getByRole("combobox", { name: "Plateforme de la ligne 1", exact: true }),
  ).toHaveValue("facebook");
  await expect(
    dialog.getByRole("combobox", { name: "Plateforme de la ligne 19", exact: true }),
  ).toHaveValue("instagram");

  await dialog.getByRole("button", { name: /Continuer/ }).click();
  await expect(dialog.getByRole("list", { name: "Résumé de l'import" })).toContainText(
    "18 nouvelles publications",
  );
  await expect(dialog).toContainText("2 doublons ignorés");
  await dialog.getByRole("button", { name: "Importer 18 publications" }).click();
  await expect(dialog).toBeHidden();
  await expect(count(page)).toHaveText("18 publications sur 24 · 6 exemples fictifs masqués");

  // Recollage du même lot : tout est déjà dans la bibliothèque.
  const again = await openImport(page, "Coller plusieurs publications");
  await again
    .getByRole("textbox", { name: "Publications à importer" })
    .fill(readFileSync(path.join(FIXTURES, "paste-20.txt"), "utf8"));
  await again.getByRole("button", { name: "Vérifier" }).click();
  await expect(again.getByText("Doublon exact (bibliothèque)").first()).toBeVisible();
  await again.getByRole("button", { name: /Continuer/ }).click();
  await expect(again.getByRole("button", { name: "Importer 0 publication" })).toBeDisabled();
  await again.getByRole("button", { name: "Remplacer…" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Remplacer" }).click();
  await expect(again.getByRole("button", { name: /Importer 1\d publications/ })).toBeEnabled();
});

test("import CSV : correspondance des colonnes, accents préservés", async ({ page }) => {
  const dialog = await openImport(page, "Fichier CSV ou Excel");
  await dialog.locator('input[type="file"]').setInputFiles(path.join(FIXTURES, "wordings.csv"));
  await expect(dialog.getByRole("row")).toHaveCount(4);
  await expect(
    dialog.getByRole("combobox", { name: "Catégorie de la ligne 1", exact: true }),
  ).toHaveValue("live_ko");
  await expect(
    dialog.getByRole("combobox", { name: "Plateforme de la ligne 2", exact: true }),
  ).toHaveValue("facebook");
  await expect(dialog).toContainText("Merci à tous pour cette soirée inoubliable à Besançon");
  await dialog.getByRole("button", { name: /Continuer/ }).click();
  await dialog.getByRole("button", { name: "Importer 3 publications" }).click();
  await expect(dialog).toBeHidden();

  await page.getByRole("searchbox").fill("« soirée inoubliable »");
  await expect(count(page)).toHaveText(/^1 publication sur/);
  await page.getByRole("listitem").getByRole("button").first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toContainText(
    "🙏 Merci à tous pour cette soirée inoubliable à Besançon. Ça restera gravé !",
  );
  await expect(sheet).toContainText("Fichier CSV");
});

test("en-têtes inconnus : écran de correspondance", async ({ page }) => {
  const dialog = await openImport(page, "Fichier CSV ou Excel");
  await dialog.locator('input[type="file"]').setInputFiles({
    name: "export.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("Légende;Colonne mystère\n💥 KO au premier round !;x\n"),
  });
  await expect(dialog).toContainText("Certains en-têtes ne sont pas reconnus");
  await expect(dialog.getByRole("combobox", { name: "Texte (requis)" })).toHaveValue("0");
  await dialog.getByRole("button", { name: "Continuer" }).click();
  await expect(
    dialog.getByRole("combobox", { name: "Catégorie de la ligne 1", exact: true }),
  ).toHaveValue("live_ko");
});

test("export Instagram avec mojibake : emojis restaurés, aperçu avant import", async ({ page }) => {
  const dialog = await openImport(page, "Publication ou export Instagram");
  await dialog.getByRole("tab", { name: "Fichier d'export (JSON)" }).click();
  await dialog
    .locator('input[type="file"]')
    .setInputFiles(path.join(FIXTURES, "instagram-posts.json"));
  const preview = dialog.getByRole("region", { name: "Aperçu des légendes trouvées" });
  await expect(preview).toContainText("3 légendes trouvées");
  await expect(preview).toContainText(
    "💥 KO de Karim Fictif au premier round ! La salle explose 🔥",
  );
  await expect(preview).toContainText("🎟️ Billetterie ouverte pour HEXAGONE MMA 13");
  await preview.getByRole("button", { name: "Vérifier" }).click();
  await dialog.getByRole("button", { name: /Continuer/ }).click();
  await dialog.getByRole("button", { name: "Importer 3 publications" }).click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("list", { name: "Publications de la bibliothèque" })).toContainText(
    "🎙️ Interview d'Ana Exemple",
  );

  // Fichier sans légende : message clair.
  const empty = await openImport(page, "Publication ou export Instagram");
  await empty.getByRole("tab", { name: "Fichier d'export (JSON)" }).click();
  await empty.locator('input[type="file"]').setInputFiles({
    name: "autre.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"profile_user": [{"string_map_data": {}}]}'),
  });
  await expect(empty.getByRole("alert")).toContainText("Aucune légende trouvée dans ce fichier");
});

test("ajout manuel : catégorie proposée, doublon bloqué avant enregistrement", async ({ page }) => {
  await page.getByRole("button", { name: "Ajouter" }).click();
  const form = page.getByRole("dialog", { name: "Ajouter une publication" });
  const text = "🐍 Soumission ! Ana Exemple place un étranglement arrière au deuxième round.";
  await form.getByLabel("Texte intégral").fill(text);
  await expect(form.getByLabel("Catégorie")).toHaveValue("live_sub");
  await form.getByRole("button", { name: "Enregistrer" }).click();
  await expect(form).toBeHidden();
  await expect(count(page)).toHaveText(/^1 publication sur 7/);

  await page.getByRole("button", { name: "Ajouter" }).click();
  await form.getByLabel("Texte intégral").fill(text);
  await form.getByRole("button", { name: "Enregistrer" }).click();
  await expect(form.getByRole("alert")).toContainText("Doublon exact");
  await expect(form.getByRole("button", { name: "Enregistrer" })).toBeDisabled();
  await form.getByRole("button", { name: "Annuler" }).click();

  // Actions : référence de style, suppression confirmée.
  await page.getByRole("button", { name: "Actions de la publication" }).click();
  await page.getByRole("menuitemcheckbox", { name: /Référence de style/ }).click();
  await expect(page.getByRole("listitem").getByText("Hors références")).toBeVisible();
  await page.getByRole("button", { name: "Actions de la publication" }).click();
  await page.getByRole("menuitem", { name: "Supprimer…" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(count(page)).toHaveText(/^0 publication sur 6/);
});

test("5 000 publications : rendu virtuel, recherche, vue mémorisée", async ({ page }) => {
  const now = new Date("2026-06-01T10:00:00.000Z");
  const wordings = await Promise.all(
    Array.from({ length: 5000 }, (_, i) =>
      createWording(
        {
          text: `Publication numéro ${i} : soirée ${i % 50} de HEXAGONE MMA, combat ${i}.`,
          mode: i % 2 ? "live" : "daily",
          categoryId: i % 2 ? "live_ko" : "comm_news",
          platform: "instagram",
          source: "bulk",
          status: "published",
          date: new Date(now.getTime() - i * 3_600_000).toISOString().slice(0, 10),
        },
        now,
      ),
    ),
  );
  await idbPut(page, "wordings", wordings);
  await page.reload();
  await waitForReady(page);
  await expect(count(page)).toHaveText("5000 publications sur 5006 · 6 exemples fictifs masqués");

  const items = page.getByRole("listitem");
  expect(await items.count()).toBeLessThan(60);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect(items.last()).toHaveAttribute("aria-posinset", "5000");
  expect(await items.count()).toBeLessThan(60);

  const started = Date.now();
  await page.getByRole("searchbox").fill('"combat 4321"');
  await expect(count(page)).toHaveText(/^1 publication sur/);
  expect(Date.now() - started).toBeLessThan(2000);

  await page.getByRole("radio", { name: "Grille" }).click();
  await page.reload();
  await waitForReady(page);
  await expect(page.getByRole("radio", { name: "Grille" })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("article").first()).toBeVisible();
});

test("Studio : « Enregistrer dans la bibliothèque » ouvre la fiche complète pré-remplie", async ({
  page,
}) => {
  await page.goto("/studio");
  await waitForReady(page);
  await expect(page.getByRole("button", { name: /GÉNÉRER LES WORDINGS/ })).toBeVisible();
  await page.keyboard.press("2");
  await page.keyboard.type("Karim Fictif");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Tom Essai");
  await page.keyboard.press("Control+Enter");
  const card = page.getByRole("article", { name: /Variante 1/ });
  await card.getByRole("button", { name: "Enregistrer dans la bibliothèque" }).click();

  const form = page.getByRole("dialog", { name: "Enregistrer dans la bibliothèque" });
  await expect(form.getByLabel("Catégorie")).toHaveValue("live_ko");
  await expect(form.getByRole("radio", { name: "Validé" })).toHaveAttribute("aria-checked", "true");
  await expect(form.getByLabel("Texte intégral")).toHaveValue(/Karim Fictif/);
  await form.getByRole("button", { name: "Enregistrer" }).click();
  await expect(form).toBeHidden();

  await page.goto("/library");
  await waitForReady(page);
  await expect(count(page)).toHaveText(/^1 publication sur 7/);
  await page.getByRole("combobox", { name: "Source", exact: true }).selectOption("studio");
  await expect(count(page)).toHaveText(/^1 publication sur 7/);
});
