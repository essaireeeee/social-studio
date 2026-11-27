/**
 * V2-2 : Atelier Français (section 6 de PROMPT_V2.md). Couche locale seule : aucun
 * LanguageTool ni fournisseur IA configuré, aucun message bloquant.
 */
import { expect, test, type Page } from "@playwright/test";
import { resetStorage, waitForReady } from "./helpers";

test.beforeEach(async () => {
  await resetStorage();
});

/** Génère trois variantes LIVE (KO) et renvoie l'éditeur de la première. */
async function generateLive(page: Page) {
  await page.goto("/studio?mode=live");
  await waitForReady(page);
  await expect(page.getByRole("button", { name: /GÉNÉRER LES WORDINGS/ })).toBeVisible();
  await page.keyboard.press("2");
  await page.keyboard.type("Karim Fictif");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Tom Essai");
  await page.keyboard.press("Control+Enter");
  const editor = page.getByRole("textbox", { name: /Texte de la variante Signature/ });
  await expect(editor).toBeVisible();
  return editor;
}

test("éditeur : soulignés, popover, badge, Tout corriger, validation avec faute", async ({
  page,
}) => {
  const editor = await generateLive(page);
  const card = page.getByRole("article", { name: /Variante 1/ });
  const badge = card.getByTestId("french-badge");
  // Le moteur natif ne produit aucune faute.
  await expect(badge).toHaveText(/Français : 0 faute/);

  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type("\nIl à gagné... Quel combat!");
  await expect(badge).toHaveText(/1 faute/);
  const mark = card.locator("mark[data-issue^='local:homo-a-sujet']");
  await expect(mark).toHaveCount(1);

  // Clic sur le mot souligné : popover avec la règle et la correction.
  const box = (await mark.boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  const issue = page.getByTestId("french-issue");
  await expect(issue).toContainText("« a » (verbe avoir)");
  await issue.getByRole("button", { name: "Corriger", exact: true }).click();
  // L'éditeur pose déjà l'espace insécable avant « ! » à la frappe (réglage V1).
  await expect(editor).toHaveValue(/Il a gagné\.\.\. Quel combat[\u00A0\u202F]?!$/);

  // Tout corriger : typographie (points de suspension, espace fine avant « ! »).
  await card.getByRole("button", { name: "Tout corriger" }).click();
  await expect(editor).toHaveValue(/Il a gagné… Quel combat[\u00A0\u202F]!$/);
  await expect(badge).toHaveText(/Français : 0 faute/);

  // Une faute restante : la validation demande confirmation.
  await editor.click();
  await page.keyboard.press("Control+End");
  await page.keyboard.type(" Ils on tout donné.");
  await expect(badge).toHaveText(/1 faute/);
  await card.getByRole("button", { name: "Valider", exact: true }).click();
  const sheet = page.getByRole("alertdialog");
  await expect(sheet).toContainText("1 faute non corrigée");
  await expect(sheet.getByRole("button", { name: "Valider quand même" })).toBeVisible();
  await sheet.getByRole("button", { name: "Corriger", exact: true }).click();
  await expect(editor).toHaveValue(/Ils ont tout donné\.$/);
});

test("Atelier : vérifier un texte et copier la version corrigée", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/plus");
  await waitForReady(page);
  await page.getByRole("link", { name: "Atelier Français" }).first().click();
  await expect(page).toHaveURL(/\/french$/);
  await expect(page.getByRole("heading", { name: "Atelier Français", level: 1 })).toBeVisible();

  const field = page.getByRole("textbox", { name: "Texte à vérifier" });
  await field.fill("Il à gagné... Quel combat! #HexagoneMMA @karim.fictif https://exemple.fr/a");
  await expect(page.locator("mark[data-issue]").first()).toBeVisible();
  // Hashtag, mention et lien ne sont jamais soulignés.
  for (const protectedText of ["#HexagoneMMA", "@karim.fictif", "exemple.fr"]) {
    await expect(page.locator("mark[data-issue]", { hasText: protectedText })).toHaveCount(0);
  }
  await page.getByRole("button", { name: "Copier le texte corrigé" }).click();
  await expect(field).toHaveValue(
    "Il a gagné… Quel combat ! #HexagoneMMA @karim.fictif https://exemple.fr/a".replace(
      " !",
      "\u202F!",
    ),
  );
  // Compatibilité réseaux sociaux : l'espace fine devient insécable à la copie.
  const copied = await page.evaluate(() => navigator.clipboard.readText());
  expect(copied).toBe(
    "Il a gagné… Quel combat\u00A0! #HexagoneMMA @karim.fictif https://exemple.fr/a",
  );

  // Retour depuis une sous-page.
  await page.getByRole("link", { name: /Mes points faibles/ }).click();
  await expect(page.getByText("Pas encore assez de données")).toBeVisible();
  await page.getByRole("banner").getByRole("link", { name: "Atelier Français" }).click();
  await expect(page).toHaveURL(/\/french$/);
});

test("Référentiel : l'administrateur désactive une règle, le correcteur la respecte", async ({
  page,
}) => {
  await page.goto("/french/rules");
  await waitForReady(page);
  await expect(page.getByText(/1[2-9]\d règles rédigées/)).toBeVisible();
  await page.getByRole("searchbox", { name: "Rechercher une règle" }).fill("verbe avoir");
  const toggle = page.getByRole("switch", { name: /Activer la règle « a » \(verbe avoir\)/ });
  await expect(toggle).toBeChecked();
  // Fiche détaillée.
  await page.getByTestId("rule-row").filter({ hasText: "« a » (verbe avoir)" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toContainText("Exemples");
  await page.keyboard.press("Escape");

  await toggle.click();
  await expect(toggle).not.toBeChecked();
  await page.goto("/french");
  await waitForReady(page);
  await page.getByRole("textbox", { name: "Texte à vérifier" }).fill("Il à gagné.");
  await page.waitForTimeout(300);
  await expect(page.locator("mark[data-issue^='local:homo-a-sujet']")).toHaveCount(0);
});

test("Dictionnaire : ajout, import CSV, suppression", async ({ page }) => {
  await page.goto("/french/dictionary");
  await waitForReady(page);
  await page.getByRole("textbox", { name: "Mot à ajouter" }).fill("Zorbatek");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  const mine = page.getByRole("region", { name: /Mes mots/ });
  await expect(mine.getByText("Zorbatek", { exact: true })).toBeVisible();

  // Un mot déjà connu (lexique MMA) est refusé.
  await page.getByRole("textbox", { name: "Mot à ajouter" }).fill("kimura");
  await page.getByRole("button", { name: "Ajouter", exact: true }).click();
  await expect(page.locator("#dictionary-error")).toContainText("déjà connu");

  await page.getByLabel("Fichier CSV de mots").setInputFiles({
    name: "mots.csv",
    mimeType: "text/csv",
    buffer: Buffer.from("mot\nLe Cube\nzorbatek\nPalais Fictif\n"),
  });
  await expect(mine.getByText("Le Cube", { exact: true })).toBeVisible();
  await expect(mine.getByText("Palais Fictif", { exact: true })).toBeVisible();
  await expect(mine.getByRole("listitem")).toHaveCount(3);

  await mine.getByRole("button", { name: "Supprimer « Le Cube »" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Supprimer" }).click();
  await expect(mine.getByText("Le Cube", { exact: true })).toHaveCount(0);
  // Mots tirés des fiches : en lecture seule.
  await expect(page.getByRole("region", { name: /Tirés des fiches/ })).toBeVisible();
});

test("Réglages sans LanguageTool ni IA, à propos, règle du jour", async ({ page }) => {
  await page.goto("/french/settings");
  await waitForReady(page);
  await expect(page.getByTestId("lt-state")).toHaveText(/LANGUAGETOOL_URL absent/);
  await expect(page.getByTestId("ai-state")).toHaveText(/Moteur natif choisi/);
  await page.getByRole("button", { name: "Tester" }).click();
  await expect(page.getByText("LANGUAGETOOL_URL n'est pas défini dans .env.local.")).toBeVisible();
  await page.getByRole("radio", { name: "21 h", exact: true }).click();
  await expect(page.getByRole("radio", { name: "21 h", exact: true })).toHaveAttribute(
    "aria-checked",
    "true",
  );

  await page.goto("/french/about");
  await waitForReady(page);
  await expect(page.getByTestId("voltaire-mention")).toHaveText(
    "Règles organisées par grandes familles, sur le modèle des référentiels d'orthographe professionnelle (type Projet Voltaire). Aucun lien ni partenariat avec le Projet Voltaire.",
  );
  await expect(page.locator('a[href*="voltaire" i]')).toHaveCount(0);

  // Règle du jour sur l'Accueil, masquable.
  await page.goto("/");
  await waitForReady(page);
  const card = page.getByTestId("rule-of-the-day");
  await expect(card).toBeVisible();
  await card.getByRole("button", { name: "Masquer" }).click();
  await expect(card).toHaveCount(0);
  await page.goto("/french/settings");
  await waitForReady(page);
  await expect(page.getByRole("switch", { name: "Règle du jour sur l'Accueil" })).not.toBeChecked();
});

test("Entraînement : série de 10, correction immédiate, progression enregistrée", async ({
  page,
}) => {
  await page.goto("/french/training");
  await waitForReady(page);
  await page.getByRole("button", { name: "Commencer une série" }).click();
  for (let i = 1; i <= 10; i += 1) {
    const group = page.getByRole("region", { name: `Exercice ${i} sur 10` });
    await expect(group).toBeVisible();
    await group.locator("button[aria-pressed]").first().click();
    await expect(group.getByText(/Bonne réponse|Raté : la bonne forme est/)).toBeVisible();
    await group
      .getByRole("button", { name: i < 10 ? "Question suivante" : "Voir le résultat" })
      .click();
  }
  await expect(page.getByText(/bonnes? réponses? sur 10/)).toBeVisible();
  const progression = page.getByRole("region", { name: "Progression par famille" });
  await expect(progression.getByRole("listitem").first()).toBeVisible();
});
