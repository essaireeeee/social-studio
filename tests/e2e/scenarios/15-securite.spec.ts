import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import { idbDump, waitForReady } from "../helpers";
import { freshStart, openStudio, variantTexts } from "./steps";

const KEY = "sk-ant-api03-E2E-SCENARIO-15-FAKE";

test("15. Sécurité : aucune clé dans le bundle ni dans l'export, repli natif sans clé", async ({
  page,
}) => {
  const scripts: string[] = [];
  page.on("response", async (response) => {
    if (response.request().resourceType() === "script") {
      scripts.push(await response.text().catch(() => ""));
    }
  });
  await freshStart(page);

  // Moteur Claude choisi sans clé, puis clé de session saisie.
  await page.goto("/settings/ai");
  await waitForReady(page);
  await page.getByRole("radio", { name: /Claude \(Anthropic\)/ }).click();
  await expect(page.getByLabel("Moteur actif : Claude · non configuré")).toBeVisible();

  // Repli natif : sans clé, la génération aboutit avec un message clair.
  await openStudio(page, "live");
  await page.keyboard.press("2");
  await page.keyboard.type("Karim Fictif");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Tom Essai");
  await page.keyboard.press("Control+Enter");
  await expect(
    page.getByText(
      /Génération IA indisponible \(.+\)\. Propositions produites par le moteur natif\./,
    ),
  ).toBeVisible();
  expect(await variantTexts(page)).toHaveLength(3);

  // Clé de session : jamais dans l'export JSON, IndexedDB ni localStorage.
  await page.goto("/settings/ai");
  await waitForReady(page);
  await page.getByRole("region", { name: "Claude (Anthropic)" }).getByLabel("Clé API").fill(KEY);
  await page.goto("/settings/data");
  await waitForReady(page);
  const [file] = await Promise.all([
    page.waitForEvent("download"),
    page.getByRole("button", { name: "Export JSON intégral" }).click(),
  ]);
  const exported = (await readFile((await file.path())!)).toString("utf8");
  expect(exported).not.toContain(KEY);
  expect(exported).not.toMatch(/"(api[-_]?key|token|secret|authorization)"/i);
  expect(await idbDump(page)).not.toContain(KEY);
  expect(await page.evaluate(() => JSON.stringify({ ...localStorage }))).not.toContain(KEY);

  // Bundle client : ni clé, ni SDK, ni hôte des fournisseurs.
  expect(scripts.length).toBeGreaterThan(0);
  for (const source of scripts) {
    expect(source).not.toContain(KEY);
    expect(source).not.toMatch(/api\.anthropic\.com|api\.openai\.com|@anthropic-ai\/sdk/);
  }
});
