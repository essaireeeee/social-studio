import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://localhost:${PORT}`;

/** Dossier de sauvegarde dédié aux tests e2e (ignoré par git), jamais `data/`. */
export const E2E_STORAGE_DIR = ".e2e-data";

export default defineConfig({
  testDir: "./tests/e2e",
  // Les scénarios partagent le dossier de sauvegarde du serveur : exécution en série.
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: { STORAGE_DIR: E2E_STORAGE_DIR, FILE_SYNC_ENABLED: "true" },
  },
});
