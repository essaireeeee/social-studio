import { expect, test } from "@playwright/test";
import { waitForReady } from "./helpers";
import { freshStart, openStudio, variantTexts } from "./scenarios/steps";

/**
 * Annexe B, définition du « terminé » : sans clé API, coller 50 anciens posts, les voir
 * analysés séparément pour LIVE et DAILY, obtenir des propositions qui s'appuient sur eux
 * sans les recopier, puis retrouver tout le travail dans un nouveau navigateur.
 */
const FIRST = [
  "Karim",
  "Tom",
  "Ana",
  "Léo",
  "Zoé",
  "Nina",
  "Hugo",
  "Yanis",
  "Bruno",
  "Enzo",
  "Théo",
  "Lina",
  "Sami",
];
const LAST = [
  "Fictif",
  "Essai",
  "Exemple",
  "Modèle",
  "Test",
  "Démo",
  "Factice",
  "Maquette",
  "Ébauche",
  "Esquisse",
  "Croquis",
  "Trame",
  "Canevas",
];
const name = (i: number) => `${FIRST[i % FIRST.length]} ${LAST[(i * 5 + 3) % LAST.length]}`;
const LIVE_LINES = [
  "La salle explose.",
  "Une droite, c'est terminé.",
  "Le public est debout.",
  "Imparable ce soir.",
  "Quelle entrée en matière.",
  "Trois coups, rideau.",
  "La cage tremble encore.",
  "Personne ne l'a vu venir.",
  "Une démonstration.",
  "Le coin adverse jette l'éponge.",
  "Froid, précis, efficace.",
  "Le cri de la foule dit tout.",
  "Une soirée qui commence fort.",
  "Le genou au sol, l'arbitre s'interpose.",
  "Pas de round deux.",
  "La tribune nord se lève.",
  "Une combinaison parfaite.",
  "Le chrono n'a pas eu le temps.",
  "Retenez ce nom.",
  "Un finish propre.",
  "Le crochet gauche fait mal.",
  "Tout le gymnase applaudit.",
  "Une marche de plus.",
  "Le plan de jeu a fonctionné.",
  "Une performance solide.",
];
const DAILY_LINES = [
  "Rendez-vous très vite.",
  "Les détails arrivent bientôt.",
  "Une affiche qui promet.",
  "Restez connectés.",
  "La préparation continue.",
  "Une soirée à ne pas manquer.",
  "Les places partent vite.",
  "Toute l'équipe est prête.",
  "On vous attend nombreux.",
  "Le compte à rebours est lancé.",
  "Un rendez-vous à noter.",
  "Merci pour votre soutien.",
  "La suite très bientôt.",
  "Une belle surprise se prépare.",
  "Préparez-vous.",
  "Le programme se dévoile.",
  "Encore quelques jours.",
  "Une ambiance unique.",
  "Toute la ligue est mobilisée.",
  "Suivez-nous pour la suite.",
  "Le plateau se complète.",
  "Les inscriptions avancent.",
  "Une date à retenir.",
  "Un nouveau chapitre.",
  "Le travail paie.",
];

function corpus(): string[] {
  const live = LIVE_LINES.map((line, i) =>
    [
      i % 3 === 0
        ? `💥 KO de ${name(i)} au R${(i % 3) + 1} !`
        : i % 3 === 1
          ? `🐍 Soumission ! ${name(i)} place un étranglement au R${(i % 3) + 1}.`
          : `⚖️ Décision unanime pour ${name(i)} après trois rounds.`,
      "",
      line,
      "",
      "#HexagoneMMA",
    ].join("\n"),
  );
  const daily = DAILY_LINES.map((line, i) =>
    [
      i % 3 === 0
        ? `🎟️ Billetterie ouverte : prenez vos places pour la soirée ${i + 1}.`
        : i % 3 === 1
          ? `🎙️ Interview de ${name(i + 7)} au micro de Radio Test.`
          : `📢 Combat officiel : ${name(i + 3)} affrontera ${name(i + 9)}.`,
      "",
      line,
    ].join("\n"),
  );
  return [...live, ...daily];
}

const analysed = async (panel: import("@playwright/test").Locator) =>
  Number(
    (
      await panel
        .getByText(/\d+ publications analysées/)
        .first()
        .innerText()
    ).match(/(\d+) publications/)![1],
  );

test("annexe B : 50 posts collés, analyse par mode, propositions sans copie, travail retrouvé", async ({
  page,
  browser,
}) => {
  test.setTimeout(120_000);
  await freshStart(page);
  const posts = corpus();

  // 1. Coller 50 anciens posts.
  await page.goto("/library");
  await waitForReady(page);
  await page.getByRole("button", { name: "Importer" }).click();
  await page.getByRole("menuitem", { name: "Coller plusieurs publications" }).click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByRole("textbox", { name: "Publications à importer" })
    .fill(posts.join("\n===\n"));
  await expect(dialog.getByTestId("bulk-count")).toHaveText("50 publications détectées");
  await dialog.getByRole("button", { name: "Vérifier" }).click();
  await expect(dialog).toContainText("50 publications détectées · 0 doublon · 0 à catégoriser");
  await dialog.getByRole("button", { name: /Continuer/ }).click();
  await dialog.getByRole("button", { name: "Importer 50 publications" }).click();
  await expect(page.getByTestId("library-count")).toHaveText(/^50 publications sur 56/);

  // 2. Analyse séparée LIVE / DAILY, profils validés par l'administrateur.
  await page.goto("/editorial");
  await waitForReady(page);
  let total = 0;
  for (const mode of ["LIVE SHOW", "DAILY & MEDIA"]) {
    await page.getByRole("tab", { name: mode, exact: true }).click();
    const panel = page.getByRole("tabpanel", { name: mode });
    await expect(panel.getByText("Proposé, non validé")).toBeVisible();
    const count = await analysed(panel);
    expect(count).toBeGreaterThanOrEqual(20);
    total += count;
    await page.getByRole("tab", { name: "Comparer" }).click();
    const compare = page.getByRole("tabpanel", { name: "Comparer" });
    await compare
      .getByRole("group", { name: "Mode à comparer" })
      .getByRole("button", { name: mode })
      .click();
    await compare.getByRole("button", { name: "Valider ce profil" }).click();
    await expect(compare).toContainText("Profil validé : il alimente désormais les moteurs.");
  }
  expect(total).toBe(50);

  // 3. Propositions : appuyées sur les posts LIVE, jamais recopiées.
  await openStudio(page, "live");
  await page.keyboard.press("2");
  await page.keyboard.type("Karim Fictif");
  await page.keyboard.press("Tab");
  await page.keyboard.type("Tom Essai");
  await page.keyboard.press("Control+Enter");
  const texts = await variantTexts(page);
  const toggle = page.getByRole("button", { name: /Références utilisées \((\d+)\)/ });
  const references = Number((await toggle.innerText()).match(/\((\d+)\)/)![1]);
  expect(references).toBeGreaterThanOrEqual(3);
  if ((await toggle.getAttribute("aria-expanded")) !== "true") await toggle.click();
  const panel = page.locator(`#${await toggle.getAttribute("aria-controls")}`);
  for (const daily of ["Billetterie ouverte", "Interview de", "Combat officiel"]) {
    await expect(panel).not.toContainText(daily);
  }
  const corpusLines = posts.flatMap((p) => p.split("\n")).filter((line) => line.length > 20);
  for (const text of texts) {
    for (const line of corpusLines) expect(text).not.toContain(line);
  }

  // 4. Le lendemain, dans un autre navigateur : tout revient depuis data/hexagone-studio.json.
  await expect
    .poll(
      async () =>
        (await (await page.request.get("/api/storage/restore")).json()).counts?.generations ?? 0,
    )
    .toBe(1);
  const next = await browser.newContext();
  const tomorrow = await next.newPage();
  await tomorrow.setViewportSize({ width: 1440, height: 900 });
  await tomorrow.goto("/");
  const restore = tomorrow.getByRole("alertdialog");
  await expect(restore).toContainText("(56 wordings)");
  await restore.getByRole("button", { name: "Restaurer" }).click();
  await waitForReady(tomorrow);
  await tomorrow.goto("/history");
  await waitForReady(tomorrow);
  await expect(tomorrow.getByRole("row")).toHaveCount(2);
  await tomorrow.goto("/editorial");
  await waitForReady(tomorrow);
  await expect(
    tomorrow.getByRole("tabpanel", { name: "LIVE SHOW" }).getByText("Validé", { exact: true }),
  ).toBeVisible();
  await next.close();
});
