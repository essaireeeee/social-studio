import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";
import { createWording } from "../../lib/database/wording-factory";

const STORAGE_DIR = path.join(process.cwd(), ".e2e-data");
const MAIN_FILE = path.join(STORAGE_DIR, "hexagone-studio.json");

test.describe.configure({ mode: "serial" });

/** Lecture directe d'IndexedDB, sans passer par le code de l'application. */
function idb<T>(page: Page, action: "count" | "get" | "put", payload?: unknown): Promise<T> {
  return page.evaluate(
    ([action, payload]) =>
      new Promise<T>((resolve, reject) => {
        const request = indexedDB.open("hexagone-social-studio");
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const db = request.result;
          const store = db
            .transaction("wordings", action === "put" ? "readwrite" : "readonly")
            .objectStore("wordings");
          const op =
            action === "count"
              ? store.count()
              : action === "get"
                ? store.get(payload as string)
                : store.put(payload);
          op.onsuccess = () => {
            resolve(op.result as T);
            db.close();
          };
          op.onerror = () => reject(op.error);
        };
      }),
    [action, payload] as const,
  );
}

async function fileWordings(): Promise<number> {
  try {
    return JSON.parse(await readFile(MAIN_FILE, "utf8")).tables.wordings.length;
  } catch {
    return -1;
  }
}

async function waitForReady(page: Page) {
  await expect(page.locator("html")).toHaveAttribute("data-db", "ready");
}

test("premier lancement : seed, persistance après actualisation, fichier local à jour", async ({
  page,
}) => {
  await rm(STORAGE_DIR, { recursive: true, force: true });

  await page.goto("/");
  await waitForReady(page);
  expect(await idb<number>(page, "count")).toBe(6);
  await expect.poll(fileWordings, { timeout: 10_000 }).toBe(6);

  // Une publication ajoutée hors de l'application doit survivre à l'actualisation.
  const wording = await createWording({
    id: "e2e-real-post",
    text: "💥 KO de Jean Testeur au premier round.\n\n#HexagoneMMA",
    mode: "live",
    categoryId: "live_ko",
    platform: "instagram",
    source: "manual",
  });
  await idb(page, "put", wording);

  await page.reload();
  await waitForReady(page);
  expect(await idb<number>(page, "count")).toBe(7);
  expect(await idb(page, "get", "e2e-real-post")).toMatchObject({ text: wording.text });
  await expect.poll(fileWordings, { timeout: 10_000 }).toBe(7);
});

test("base vide et fichier présent : la restauration est proposée puis appliquée", async ({
  page,
}) => {
  await page.goto("/");
  const dialog = page.getByRole("alertdialog");
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText(
    /Une sauvegarde locale du \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} a été trouvée \(7 wordings\)\. Restaurer \?/,
  );

  await page.keyboard.press("Escape");
  await expect(dialog).toBeVisible();

  await dialog.getByRole("button", { name: "Restaurer" }).click();
  await waitForReady(page);
  await expect(dialog).toBeHidden();
  expect(await idb<number>(page, "count")).toBe(7);
  expect(await idb(page, "get", "e2e-real-post")).toBeTruthy();
});

test("Ignorer : démarre avec les exemples et garde une copie du fichier dans backups", async ({
  page,
}) => {
  await page.goto("/");
  const dialog = page.getByRole("alertdialog");
  await dialog.getByRole("button", { name: "Ignorer" }).click();
  await waitForReady(page);
  expect(await idb<number>(page, "count")).toBe(6);

  const backups = await readdir(path.join(STORAGE_DIR, "backups"));
  const contents = await Promise.all(
    backups.map(async (name) =>
      JSON.parse(await readFile(path.join(STORAGE_DIR, "backups", name), "utf8")),
    ),
  );
  expect(contents.some((snapshot) => snapshot.tables.wordings.length === 7)).toBe(true);
});
