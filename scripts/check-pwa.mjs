/**
 * Vérifie l'application installable sur un build de production (section 5.7 de PROMPT_V2.md) :
 * service worker actif, aucune erreur d'installabilité selon Chromium, démarrage hors ligne.
 *
 *   npm run build && npm run start      (dans un autre terminal)
 *   npm run check:pwa                    (PWA_URL=http://localhost:3000 par défaut)
 */
import { chromium } from "@playwright/test";

const url = process.env.PWA_URL ?? "http://localhost:3000/";

try {
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
  });
  const page = await context.newPage();
  await page.goto(url, { waitUntil: "networkidle" });
  await page.waitForSelector('html[data-db="ready"]');
  const worker = await page.evaluate(async () =>
    Boolean((await navigator.serviceWorker.ready).active),
  );
  const cdp = await context.newCDPSession(page);
  const { installabilityErrors } = await cdp.send("Page.getInstallabilityErrors");
  await page.reload({ waitUntil: "networkidle" });
  await context.setOffline(true);
  await page.reload();
  await page.waitForSelector('html[data-db="ready"]', { timeout: 15_000 });
  const offline = await page.getByRole("heading", { level: 1 }).first().textContent();
  await browser.close();

  const ok = worker && installabilityErrors.length === 0 && Boolean(offline);
  const report = [
    `Service worker actif : ${worker ? "oui" : "non"}`,
    `Erreurs d'installabilité : ${installabilityErrors.length === 0 ? "aucune" : JSON.stringify(installabilityErrors)}`,
    `Démarrage hors ligne : ${offline ? `oui (« ${offline} »)` : "non"}`,
  ];
  process.stdout.write(`${report.join("\n")}\n`);
  process.exit(ok ? 0 : 1);
} catch (error) {
  console.error(`Vérification impossible : ${error.message}`);
  process.exit(1);
}
