import { expect, test } from "@playwright/test";
import { createWording } from "@/lib/database/wording-factory";
import { waitForReady } from "../helpers";
import { freshStart, seed } from "./steps";

test("7. Recherche d'un ancien wording similaire dans la bibliothèque", async ({ page }) => {
  await freshStart(page);
  const live = {
    mode: "live" as const,
    platform: "instagram" as const,
    source: "manual" as const,
    status: "published" as const,
  };
  await seed(page, "wordings", [
    await createWording({
      ...live,
      categoryId: "live_sub",
      date: "2025-03-14",
      text: "🐍 Ana Exemple place un étranglement arrière au deuxième round. Imparable.",
    }),
    await createWording({
      ...live,
      categoryId: "live_ko",
      date: "2025-06-01",
      text: "💥 KO de Karim Fictif, une droite et c'est fini.",
    }),
    await createWording({
      ...live,
      mode: "daily",
      categoryId: "daily_ticketing",
      date: "2025-09-01",
      text: "🎟️ Billetterie ouverte pour la prochaine soirée.",
    }),
  ]);
  await page.goto("/library");
  await waitForReady(page);
  const search = page.getByRole("searchbox");
  const results = page.getByRole("list", { name: "Publications de la bibliothèque" });

  // Mots proches, sans accent ni ordre : BM25.
  await search.fill("etranglement round Ana");
  await expect(page.getByTestId("library-count")).toHaveText(/^1 publication sur/);
  await expect(results).toContainText("étranglement arrière");

  // Expression exacte entre guillemets.
  await search.fill('"une droite"');
  await expect(results).toContainText("KO de Karim Fictif");
  await expect(page.getByTestId("library-count")).toHaveText(/^1 publication sur/);
});
