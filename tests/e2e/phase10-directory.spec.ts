import { expect, test, type Page } from "@playwright/test";
import { idbPut, resetStorage, waitForReady } from "./helpers";

const NOW = new Date().toISOString();

const FIGHTERS = [
  { id: "f-karim", firstName: "Karim", lastName: "Fictif", fightHistory: [], updatedAt: NOW },
  { id: "f-tom", firstName: "Tom", lastName: "Essai", fightHistory: [], updatedAt: NOW },
];

const EVENT = {
  id: "ev13",
  name: "HEXAGONE MMA",
  number: 13,
  date: "2030-12-14",
  city: "Besançon",
  venue: "Micropolis",
  links: [],
  broadcasters: [
    { name: "Chaîne Test", channel: "Chaîne Test", startTime: "19h00", scope: "prelims" },
    { name: "Chaîne Test", channel: "Chaîne Test Max", startTime: "21h00", scope: "main_card" },
  ],
  confirmedSchedule: false,
  fightCard: [],
  updatedAt: NOW,
};

test.beforeEach(async ({ page }) => {
  await resetStorage();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await waitForReady(page);
});

async function seed(page: Page) {
  await idbPut(page, "fighters", FIGHTERS);
  await idbPut(page, "events", [EVENT]);
}

async function announceWithEvent(page: Page) {
  await page.goto("/studio?mode=daily");
  await waitForReady(page);
  await expect(page.getByRole("button", { name: /GÉNÉRER LES WORDINGS/ })).toBeVisible();
  await page.getByLabel("Rechercher une catégorie").fill("Annonce événement");
  await page.getByRole("button", { name: /Annonce événement/ }).click();
  await page.getByLabel("Événement", { exact: true }).fill("HEXAGONE MMA 13");
}

test("événement choisi dans le brief : date, salle, ville ; signature ; aucun horaire non confirmé", async ({
  page,
}) => {
  await seed(page);
  await announceWithEvent(page);
  await expect(page.getByLabel("Date", { exact: true })).toHaveValue("2030-12-14");
  await expect(page.getByLabel("Salle", { exact: true })).toHaveValue("Micropolis");
  await expect(page.getByLabel("Ville", { exact: true })).toHaveValue("Besançon");

  await page.keyboard.press("Control+Enter");
  const card = page.getByRole("article", { name: /Variante 1/ });
  const editor = card.getByRole("textbox").first();
  await expect(editor).toHaveValue(/🗓️ Samedi 14 décembre - Micropolis, Besançon/);
  await expect(editor).toHaveValue(/📺 En direct sur Chaîne Test/);
  for (const variant of await page.getByRole("article", { name: /Variante/ }).all()) {
    const text = await variant.getByRole("textbox").first().inputValue();
    expect(text).not.toMatch(/19h00|21h00/);
  }

  // Signature « Diffusion détaillée » : refusée tant que les horaires ne sont pas confirmés.
  await page
    .getByRole("combobox", { name: "Signature", exact: true })
    .selectOption({ label: "Diffusion détaillée" });
  await expect(page.getByText("Horaires non confirmés pour cet événement")).toBeVisible();

  // Horaires confirmés dans la fiche : la ligne horaire apparaît.
  await page.goto("/events");
  await waitForReady(page);
  await page.getByRole("button", { name: /HEXAGONE MMA 13/ }).click();
  await page.getByLabel("Horaires confirmés").check();
  await page.getByRole("button", { name: "Enregistrer l'événement" }).click();
  await expect(page.getByText("Événement mis à jour")).toBeVisible();

  await page.goto("/studio?mode=daily");
  await waitForReady(page);
  await expect(page.getByText("Horaires non confirmés pour cet événement")).toBeHidden();
  await page.getByRole("button", { name: /GÉNÉRER LES WORDINGS/ }).click();
  await expect(
    page
      .getByRole("article", { name: /Variante 1/ })
      .getByRole("textbox")
      .first(),
  ).toHaveValue(
    /à partir de 19h00 sur Chaîne Test et à partir de 21h00 pour la carte principale sur Chaîne Test Max/,
  );
});

test("combattants : palmarès daté, historique, filtres, fiche mise à jour", async ({ page }) => {
  await page.goto("/fighters");
  await waitForReady(page);
  await page.getByRole("button", { name: "Nouveau combattant" }).click();
  const form = page.getByRole("form", { name: "Nouveau combattant" });
  await form.getByLabel("Prénom").fill("Karim");
  await form.getByLabel("Nom", { exact: true }).fill("Fictif");
  await form.getByLabel("Club").fill("Team Nord");
  await form.getByLabel("Victoires").fill("10");
  await form.getByLabel("Défaites").fill("2");
  await form.getByLabel("Nuls").fill("0");
  await form.getByRole("button", { name: "Créer la fiche" }).click();
  await expect(form.getByText("Indiquez à quelle date ce palmarès est exact.")).toBeVisible();
  await form.getByLabel("Exact au").fill("2030-01-15");
  await form.getByRole("button", { name: "Ajouter un combat" }).click();
  await form.getByLabel("Date du combat 1").fill("2029-06-01");
  await form.getByLabel("Adversaire du combat 1").fill("Tom Essai");
  await form.getByRole("button", { name: "Créer la fiche" }).click();
  await expect(page.getByText("Combattant ajouté")).toBeVisible();

  const sheet = page.getByRole("region", { name: "Fiche" });
  await expect(sheet.getByRole("heading", { name: "Karim Fictif" })).toBeVisible();
  await expect(sheet).toContainText("Mise à jour le");
  await expect(sheet.getByRole("tab", { name: "Publications associées (0)" })).toBeVisible();

  const list = page.getByRole("list", { name: "Combattants" });
  await expect(list.getByRole("button")).toHaveCount(2); // Samba Sima (exemple) et Karim Fictif
  await page.getByRole("combobox", { name: "Club" }).selectOption("Team Nord");
  await expect(list.getByRole("button")).toHaveCount(1);

  await page.reload();
  await waitForReady(page);
  await page.getByRole("button", { name: /Karim Fictif/ }).click();
  await expect(page.getByLabel("Exact au")).toHaveValue("2030-01-15");
  await expect(page.getByLabel("Adversaire du combat 1")).toHaveValue("Tom Essai");
});

test("événements : fight card par glisser-déposer, chronologie, Session Live", async ({ page }) => {
  await idbPut(page, "fighters", FIGHTERS);
  await idbPut(page, "events", [{ ...EVENT, id: "ev-old", number: 9, date: "2020-03-01" }]);
  await page.goto("/events");
  await waitForReady(page);
  await expect(page.getByRole("region", { name: "Passés" })).toContainText("HEXAGONE MMA 9");

  await page.getByRole("button", { name: "Nouvel événement" }).click();
  const form = page.getByRole("form", { name: "Nouvel événement" });
  await form.getByLabel("Numéro").fill("14");
  await form.getByLabel("Date", { exact: true }).fill("2031-02-01");
  await form.getByLabel("Ville").fill("Dijon");
  const pool = form.getByRole("list", { name: "Combattants disponibles" });
  await pool.getByText("Karim Fictif").dragTo(form.getByTestId("new-fight-zone"));
  await pool.getByText("Tom Essai").dragTo(form.getByTestId("slot-Combat 1, coin B"));
  await expect(form.getByLabel("Combat 1, coin A")).toHaveValue("f-karim");
  await expect(form.getByLabel("Combat 1, coin B")).toHaveValue("f-tom");
  await expect(pool.getByRole("listitem")).toHaveText(["Samba Sima"]);
  await form.getByLabel("Position du combat 1").selectOption("main");
  await form.getByRole("button", { name: "Créer l'événement" }).click();
  await expect(page.getByText("Événement créé")).toBeVisible();
  await expect(page.getByRole("region", { name: "À venir" })).toContainText("HEXAGONE MMA 14");

  await page.reload();
  await waitForReady(page);
  await page.getByRole("button", { name: /HEXAGONE MMA 14/ }).click();
  await expect(page.getByLabel("Combat 1, coin B")).toHaveValue("f-tom");
  await page.getByRole("button", { name: "Démarrer la Session Live pour cet événement" }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog.getByLabel(/Nom de l'événement/)).toHaveValue("HEXAGONE MMA");
  await expect(dialog.getByLabel("Ville")).toHaveValue("Dijon");
  await expect(page.locator("html")).toHaveAttribute("data-mode", "live");
});

test("hashtags et signatures : normalisation, ordre, variables, aperçu", async ({ page }) => {
  await seed(page);
  await page.goto("/hashtags");
  await waitForReady(page);
  await page.getByRole("button", { name: "Nouveau groupe" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nom").fill("Soirée Besançon");
  await dialog.getByLabel("Hashtags").fill("hexagone besançon, #Besançon 2030");
  await expect(dialog.getByTestId("normalized-tags")).toHaveText(
    "Sera enregistré : #hexagonebesançon #Besançon2030",
  );
  await dialog.getByRole("button", { name: "Enregistrer" }).click();
  const groups = page.getByRole("list", { name: "Groupes de hashtags" });
  await expect(groups.getByRole("listitem")).toHaveCount(3);
  await groups.getByRole("button", { name: "Monter Soirée Besançon" }).click();
  await expect(groups.getByRole("listitem").nth(1)).toHaveAccessibleName("Soirée Besançon");

  await page.getByRole("tab", { name: /Signatures/ }).click();
  const signatures = page.getByRole("list", { name: "Signatures" });
  await expect(
    signatures.getByRole("listitem").first().getByTestId("signature-preview"),
  ).toContainText("Micropolis, Besançon");
  await expect(signatures.getByRole("listitem").nth(1).getByTestId("signature-preview")).toHaveText(
    "Non ajoutée : les horaires de cet événement ne sont pas confirmés.",
  );

  await page.getByRole("button", { name: "Nouvelle signature" }).click();
  const editor = page.getByRole("dialog");
  await editor.getByLabel("Nom").fill("Billetterie");
  await editor.getByLabel("Modèle").fill("🎫 {heure}");
  await editor.getByRole("button", { name: "Enregistrer" }).click();
  await expect(editor.getByText("Variable inconnue : {heure}.")).toBeVisible();
  await editor.getByLabel("Modèle").fill("📍 {venue}\n🕘 {mainTime}\n");
  await editor
    .getByRole("group", { name: "Insérer une variable" })
    .getByRole("button", { name: "{city}" })
    .click();
  await expect(editor.getByTestId("signature-preview")).toHaveText("📍 Micropolis\nBesançon");
  await editor.getByRole("button", { name: "Enregistrer" }).click();
  await expect(signatures.getByRole("listitem")).toHaveCount(3);
});
