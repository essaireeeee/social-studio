import { readFile } from "node:fs/promises";
import { expect, test, type Page } from "@playwright/test";
import { createWording } from "@/lib/database/wording-factory";
import { idbPut, resetStorage, waitForReady } from "./helpers";

const NOW = new Date().toISOString();

test.beforeEach(async ({ page }) => {
  await resetStorage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await waitForReady(page);
});

async function download(page: Page, button: string): Promise<{ name: string; bytes: Buffer }> {
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: button }).click(),
  ]);
  return { name: file.suggestedFilename(), bytes: await readFile((await file.path())!) };
}

type Exported = { tables: Record<string, { id: string }[]>; meta: { settings: unknown } };
const sorted = (snapshot: Exported) =>
  Object.fromEntries(
    Object.entries(snapshot.tables).map(([name, rows]) => [
      name,
      [...rows].sort((a, b) => a.id.localeCompare(b.id)),
    ]),
  );

test("export JSON → réinitialisation → import JSON : données identiques", async ({ page }) => {
  await idbPut(page, "fighters", [
    { id: "f-karim", firstName: "Karim", lastName: "Fictif", fightHistory: [], updatedAt: NOW },
  ]);
  await page.goto("/settings/preferences");
  await waitForReady(page);
  await page.getByLabel("Nom de compte affiché dans l'aperçu").fill("hexagone_test");
  await page.getByRole("button", { name: "Enregistrer les préférences" }).click();
  await expect(page.getByText("Préférences enregistrées")).toBeVisible();

  await page.goto("/settings/data");
  await waitForReady(page);
  const first = await download(page, "Export JSON intégral");
  expect(first.name).toMatch(/^hexagone-studio-sauvegarde-.*\.json$/);
  const before = JSON.parse(first.bytes.toString("utf8")) as Exported;
  expect(before.tables.fighters!.map((f) => f.id)).toContain("f-karim");
  expect(first.bytes.toString("utf8")).not.toMatch(/apiKey|"token"|"secret"/i);

  // Réinitialisation : trois confirmations, export automatique, retour à l'état initial.
  await page.getByRole("button", { name: "Réinitialiser l'application…" }).click();
  const confirm = page.getByRole("alertdialog");
  await confirm.getByRole("button", { name: "Continuer" }).click();
  await confirm.getByRole("button", { name: "Continuer" }).click();
  await expect(confirm.getByRole("button", { name: "Réinitialiser" })).toBeDisabled();
  await confirm.getByRole("textbox").fill("RÉINITIALISER");
  const [automatic] = await Promise.all([
    page.waitForEvent("download"),
    confirm.getByRole("button", { name: "Réinitialiser" }).click(),
  ]);
  expect(automatic.suggestedFilename()).toMatch(/avant-reinitialisation/);
  await page.waitForURL("**/");
  await waitForReady(page);
  await expect(page.getByRole("heading", { name: "Accueil", level: 1 })).toBeVisible();
  await page.goto("/fighters");
  await waitForReady(page);
  await expect(page.getByRole("list", { name: "Combattants" })).not.toContainText("Karim Fictif");

  // Import du premier export, en remplaçant (double confirmation).
  await page.goto("/settings/data");
  await waitForReady(page);
  const importBlock = page.getByRole("region", { name: "Importer un export JSON" });
  await importBlock.locator('input[type="file"]').setInputFiles({
    name: first.name,
    mimeType: "application/json",
    buffer: first.bytes,
  });
  await expect(importBlock.getByRole("table")).toContainText("Combattants");
  await importBlock.getByRole("radio", { name: "Remplacer" }).click();
  await importBlock.getByRole("button", { name: "Remplacer les données…" }).click();
  await confirm.getByRole("button", { name: "Continuer" }).click();
  await confirm.getByRole("button", { name: "Remplacer les données" }).click();
  await expect(page.getByText(/Données remplacées/)).toBeVisible();

  const second = await download(page, "Export JSON intégral");
  const after = JSON.parse(second.bytes.toString("utf8")) as Exported;
  expect(sorted(after)).toEqual(sorted(before));
  expect(after.meta.settings).toEqual(before.meta.settings);
});

test("export CSV : BOM UTF-8, accents et emojis, exemples fictifs exclus", async ({ page }) => {
  await idbPut(page, "wordings", [
    await createWording({
      text: "💥 KO à Besançon, la salle est en ébullition !",
      mode: "live",
      categoryId: "live_ko",
      platform: "instagram",
      source: "manual",
      status: "published",
    }),
  ]);
  await page.goto("/settings/data");
  await waitForReady(page);
  const csv = await download(page, "Bibliothèque en CSV");
  expect(csv.name).toMatch(/\.csv$/);
  expect([...csv.bytes.subarray(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
  const text = csv.bytes.toString("utf8");
  expect(text).toContain('"💥 KO à Besançon, la salle est en ébullition !"');
  expect(text.split("\r\n")[0]).toContain('"texte";"mode";"categorie"');
  expect(text).not.toContain("KO AU PREMIER ROUND");

  const excel = await download(page, "Excel (une feuille par table)");
  expect(excel.name).toMatch(/\.xlsx$/);
  expect(excel.bytes.subarray(0, 2).toString("latin1")).toBe("PK");

  // Suppression des exemples fictifs.
  await expect(page.getByTestId("demo-count")).toHaveText("6 exemples fictifs");
  await page.getByRole("button", { name: "Supprimer les exemples fictifs" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(page.getByTestId("demo-count")).toHaveText("Aucun exemple fictif.");
});

test("historique, validation, apprentissage contrôlé, dashboard", async ({ page }) => {
  await page.goto("/studio");
  await waitForReady(page);
  await expect(page.getByRole("button", { name: /GÉNÉRER LES WORDINGS/ })).toBeVisible();
  await page.keyboard.press("2");
  await page.keyboard.type("Karim Fictif");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Tom Essai");
  await page.keyboard.press("Control+Enter");
  await expect(page.getByRole("article", { name: /Variante 1/ })).toBeVisible();

  await page.goto("/history");
  await waitForReady(page);
  const row = page.getByRole("row").nth(1);
  await expect(row).toContainText("Brouillon");
  await expect(row).toContainText("KO / TKO");
  await row.getByRole("button").click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("region", { name: "Brief initial" })).toContainText("Karim Fictif");
  await expect(
    sheet.getByRole("region", { name: "Variantes" }).getByText("Moteur · Natif").first(),
  ).toBeVisible();
  await sheet.getByRole("button", { name: "Valider" }).click();
  await expect(sheet.getByText("Validé", { exact: true })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("row").nth(1)).toContainText("Validé");

  // Rien n'entre seul dans le corpus : la publication attend dans « Publications validées ».
  await page.goto("/validated");
  await waitForReady(page);
  const pending = page.getByRole("list", { name: "Publications en attente" });
  await expect(pending.getByRole("listitem")).toHaveCount(1);
  await pending.getByRole("button", { name: "Ajouter comme référence" }).click();
  await expect(page.getByText("Aucune publication validée en attente.")).toBeVisible();

  await page.goto("/");
  await waitForReady(page);
  await expect(page.getByTestId("reference-counts")).toContainText("1 réelles");
  await expect(page.getByRole("region", { name: "Dernières générations" })).toContainText("Validé");
  await page.getByRole("link", { name: "NOUVEAU WORDING" }).click();
  await expect(page).toHaveURL(/\/studio$/);
});

test("profils locaux : création, profil actif, toujours un administrateur", async ({ page }) => {
  await page.goto("/settings/users");
  await waitForReady(page);
  await expect(page.getByText("Contrôle de rôle local, sans authentification.")).toBeVisible();
  await page.getByRole("button", { name: "Nouveau profil" }).click();
  await page.getByLabel("Nom").fill("Léa");
  await page.getByRole("button", { name: "Enregistrer" }).click();
  const lea = page.getByRole("listitem", { name: "Léa" });
  await lea.getByRole("button", { name: "Activer" }).click();
  await expect(lea).toContainText("Profil actif");
  // V2 : le profil actif s'affiche au pied de la barre latérale.
  await expect(page.getByRole("complementary", { name: "Barre latérale" })).toContainText("Léa");

  // Le seul administrateur ne peut pas devenir CM.
  const admin = page.getByRole("listitem", { name: "Community Manager" });
  await admin.getByRole("button", { name: "Modifier Community Manager" }).click();
  await page.getByRole("radio", { name: "Community manager" }).click();
  await page.getByRole("button", { name: "Enregistrer" }).click();
  await expect(page.getByText("Il doit rester au moins un administrateur.")).toBeVisible();
});
