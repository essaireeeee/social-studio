import { expect, test } from "@playwright/test";
import { idbDump, resetStorage, waitForReady } from "./helpers";

const KEY = "sk-ant-e2e-session-0123456789";

test.beforeEach(async ({ page }) => {
  await resetStorage();
  await page.goto("/settings/ai");
  await waitForReady(page);
});

test("choix du moteur, clé de session jamais persistée", async ({ page, browser }) => {
  await expect(page.getByRole("heading", { name: "Intelligence artificielle" })).toBeVisible();
  await expect(page.getByLabel("Moteur actif : Natif")).toBeVisible();
  await expect(page.getByRole("radio", { name: /Natif/ })).toHaveAttribute("aria-checked", "true");

  const claude = page.getByRole("region", { name: "Claude (Anthropic)" });
  const openai = page.getByRole("region", { name: "OpenAI" });
  await expect(claude.getByText("Non configuré")).toBeVisible();
  await expect(openai.getByText("Non configuré")).toBeVisible();
  await expect(claude.getByRole("button", { name: "Tester la connexion" })).toBeDisabled();

  // Choix Claude sans clé : la bascule native est annoncée.
  await page.getByRole("radio", { name: /Claude \(Anthropic\)/ }).click();
  await expect(page.getByLabel("Moteur actif : Claude · non configuré")).toBeVisible();
  await expect(page.getByText(/chaque génération basculera sur le moteur natif/)).toBeVisible();

  // Clé de session.
  await claude.getByLabel("Clé API").fill(KEY);
  await expect(claude.getByText("Clé de session")).toBeVisible();
  await expect(
    claude.getByText("Conservée uniquement pour cette session de navigateur. Jamais enregistrée."),
  ).toBeVisible();
  await expect(page.getByLabel("Moteur actif : Claude · non testé")).toBeVisible();
  await expect(claude.getByRole("button", { name: "Tester la connexion" })).toBeEnabled();
  await expect(claude.getByText("Modèle utilisé : claude-sonnet-5-5 (par défaut).")).toBeVisible();

  // Stockage : sessionStorage uniquement.
  expect(await page.evaluate(() => JSON.stringify({ ...sessionStorage }))).toContain(KEY);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toContain(KEY);
  expect(await idbDump(page)).not.toContain(KEY);
  expect(await idbDump(page)).toContain('"aiProvider":"anthropic"');

  // Même onglet après rechargement : choix et clé conservés.
  await page.reload();
  await waitForReady(page);
  await expect(page.getByRole("radio", { name: /Claude \(Anthropic\)/ })).toHaveAttribute(
    "aria-checked",
    "true",
  );
  await expect(claude.getByLabel("Clé API")).toHaveValue(KEY);

  // Autre session de navigateur : aucune clé (la sauvegarde fichier n'en contient pas non plus).
  const other = await browser.newContext();
  const fresh = await other.newPage();
  await fresh.goto("/settings/ai");
  expect(await fresh.evaluate(() => sessionStorage.length)).toBe(0);
  const backup = await fresh.request.get("/api/storage/restore?include=snapshot");
  expect(await backup.text()).not.toContain(KEY);
  await other.close();

  // Effacer.
  await claude.getByRole("button", { name: "Effacer" }).click();
  await expect(claude.getByText("Non configuré")).toBeVisible();
  expect(await page.evaluate(() => sessionStorage.length)).toBe(0);
});

test("section inconnue : page introuvable", async ({ page }) => {
  const response = await page.goto("/settings/inconnue");
  expect(response?.status()).toBe(404);
});
