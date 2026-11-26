import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/**
 * Captures pour revue humaine (critère de la phase V2-1) : `npm run screenshots`.
 * Séparées de la suite e2e pour ne pas réécrire les images à chaque lancement des tests.
 */
export default defineConfig({
  ...base,
  testDir: "./tests/screenshots",
  reporter: [["list"]],
  timeout: 120_000,
});
