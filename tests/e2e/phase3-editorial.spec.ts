import { expect, test } from "@playwright/test";
import { CORPUS_FIGHTERS, buildStyleCorpus } from "../fixtures/style-corpus";
import { idbPut, resetStorage, waitForReady } from "./helpers";

test.beforeEach(async ({ page }) => {
  await resetStorage();
  await page.goto("/editorial");
  await waitForReady(page);
});

test("corpus insuffisant : message explicite, démos seulement sur demande", async ({ page }) => {
  const live = page.getByRole("tabpanel", { name: "LIVE SHOW" });
  await live.getByRole("button", { name: "Analyser la bibliothèque" }).click();
  await expect(live).toContainText(
    "Corpus insuffisant pour tirer des conclusions (0 publication analysée).",
  );

  await live.getByLabel("Inclure les exemples fictifs").check();
  await live.getByRole("button", { name: "Recalculer" }).click();
  await expect(live).toContainText("(3 publications analysées)");
  await expect(live).toContainText("Profil calculé avec les exemples fictifs");
});

test("profil mesuré, comparaison puis validation par l'administrateur", async ({ page }) => {
  await idbPut(page, "fighters", CORPUS_FIGHTERS);
  await idbPut(page, "wordings", await buildStyleCorpus());

  const live = page.getByRole("tabpanel", { name: "LIVE SHOW" });
  await live.getByRole("button", { name: "Analyser la bibliothèque" }).click();
  await expect(live.getByText("Proposé, non validé")).toBeVisible();
  await expect(live.getByText("{E} ko de {NOM} au {N}").first()).toBeVisible();
  await expect(live.getByText("trois rounds intenses").first()).toBeVisible();
  await expect(live.getByText("20 publications analysées").first()).toBeVisible();

  await page.getByRole("tab", { name: "Comparer" }).click();
  const compare = page.getByRole("tabpanel", { name: "Comparer" });
  await expect(compare.getByRole("cell", { name: "Publications analysées" })).toBeVisible();
  await compare.getByRole("button", { name: "Valider ce profil" }).click();
  await expect(compare).toContainText("Profil validé : il alimente désormais les moteurs.");

  await page.getByRole("tab", { name: "LIVE SHOW" }).click();
  await expect(live.getByText("Validé", { exact: true })).toBeVisible();
  await expect(live).toContainText("Les moteurs utilisent le profil validé le");
});

test("règles éditoriales : activation et liste éditable, conservées après actualisation", async ({
  page,
}) => {
  const rules = page.getByRole("region", { name: "Règles éditoriales" });
  const veritable = rules.getByRole("checkbox", { name: /Pas de « véritable » en ouverture/ });
  await expect(veritable).toBeChecked();
  await veritable.uncheck();

  await rules.getByRole("textbox", { name: /Ajouter à : Samba Sima/ }).fill("talent rare");
  await rules.getByRole("textbox", { name: /Ajouter à : Samba Sima/ }).press("Enter");
  await rules.getByRole("button", { name: "Enregistrer" }).click();
  await expect(rules.getByText("Enregistré")).toBeVisible();

  await page.reload();
  await waitForReady(page);
  await expect(
    rules.getByRole("checkbox", { name: /Pas de « véritable » en ouverture/ }),
  ).not.toBeChecked();
  await expect(rules.getByText("talent rare")).toBeVisible();
});
