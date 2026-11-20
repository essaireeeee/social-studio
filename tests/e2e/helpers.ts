import { rm } from "node:fs/promises";
import path from "node:path";
import { expect, type Page } from "@playwright/test";

export const STORAGE_DIR = path.join(process.cwd(), ".e2e-data");

/** Repart d'un dossier de sauvegarde vide (sinon la restauration serait proposée). */
export async function resetStorage(): Promise<void> {
  await rm(STORAGE_DIR, { recursive: true, force: true });
}

export async function waitForReady(page: Page): Promise<void> {
  await expect(page.locator("html")).toHaveAttribute("data-db", "ready");
}

/** Écrit directement dans IndexedDB, sans passer par l'application (données de test). */
export function idbPut(page: Page, store: string, records: unknown[]): Promise<void> {
  return page.evaluate(
    ([store, records]) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open("hexagone-social-studio");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const tx = db.transaction(store as string, "readwrite");
          for (const record of records as unknown[]) tx.objectStore(store as string).put(record);
          tx.oncomplete = () => {
            db.close();
            resolve();
          };
          tx.onerror = () => reject(tx.error);
        };
      }),
    [store, records] as const,
  );
}
