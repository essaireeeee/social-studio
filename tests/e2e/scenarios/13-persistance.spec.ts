import { expect, test } from "@playwright/test";
import { waitForReady } from "../helpers";
import { freshStart, openStudio, startSession, variantTexts } from "./steps";

test("13. Persistance après actualisation : brief, génération, Session Live, fichier local", async ({
  page,
}) => {
  await freshStart(page);
  await openStudio(page, "live");
  await startSession(page);
  await page.keyboard.press("2");
  await page.keyboard.type("Karim Fictif");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Tom Essai");
  await page.keyboard.press("Control+Enter");
  const before = await variantTexts(page);
  const round = () =>
    page.getByRole("group", { name: "Round" }).getByRole("button", { name: "R2" });
  await round().click(); // brief encore en cours après la génération

  await page.reload();
  await waitForReady(page);
  await expect(page.getByRole("region", { name: "Session Live" })).toContainText("HEXAGONE MMA 12");
  await expect(page.getByLabel("Vainqueur")).toHaveValue("Karim Fictif");
  await expect(round()).toHaveAttribute("aria-pressed", "true");
  expect(await variantTexts(page)).toEqual(before);

  // Le fichier data/hexagone-studio.json suit la base.
  await expect
    .poll(
      async () =>
        (await (await page.request.get("/api/storage/restore")).json()).counts?.generations ?? 0,
    )
    .toBeGreaterThanOrEqual(1);
  const summary = await (await page.request.get("/api/storage/restore")).json();
  expect(summary).toMatchObject({ found: true, valid: true });
  expect(summary.counts.liveSessions).toBe(1);
});
