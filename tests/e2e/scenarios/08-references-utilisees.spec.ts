import { expect, test } from "@playwright/test";
import { RETRIEVAL_FIGHTERS, buildRetrievalCorpus } from "../../fixtures/retrieval-corpus";
import { freshStart, generate, openStudio, seed } from "./steps";

test("8. Les bonnes références dans « Références utilisées »", async ({ page }) => {
  await freshStart(page);
  await seed(page, "fighters", RETRIEVAL_FIGHTERS);
  await seed(page, "wordings", await buildRetrievalCorpus());
  await openStudio(page, "live");
  await page.keyboard.press("2");
  await page.keyboard.type("Karim Fictif");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Tom Essai");
  await generate(page);

  const toggle = page.getByRole("button", { name: /Références utilisées \(\d+\)/ });
  await expect(toggle).toBeVisible();
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  const panel = page.getByRole("list").filter({ hasText: "KO de Karim Fictif au R1" });
  await expect(panel).toBeVisible();
  // Même mode seulement, jamais d'exemple fictif ni de publication écartée.
  await expect(panel).not.toContainText("COMBAT OFFICIEL");
  await expect(panel).not.toContainText("se confie");
  await expect(panel).not.toContainText("KO démo");
  await expect(panel).not.toContainText("version écartée");
});
