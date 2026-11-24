import { afterEach, beforeEach, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import Papa from "papaparse";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import { runSeed } from "@/lib/database/seed";
import { createWording } from "@/lib/database/wording-factory";
import { dashboardStats, livePercent } from "@/lib/dashboard/stats";
import { snapshotWorkbook, tableRows } from "@/lib/data/excel-export";
import { exportFileName, libraryCsv, snapshotJson, UTF8_BOM } from "@/lib/data/export";
import { readSnapshotText } from "@/lib/data/import-json";
import { deleteDemoWordings, resetApplication } from "@/lib/data/maintenance";
import {
  filterHistory,
  finalTextOf,
  GENERATION_STATUS_LABELS,
  initialTextOf,
  pendingReferences,
  statusActions,
} from "@/lib/history/history";
import { parseCsv } from "@/lib/import/csv";
import { needsMapping, recordsFromTable, suggestMapping } from "@/lib/import/table";
import { addOption, logoError, moveItem, preferencesErrors } from "@/lib/settings/preferences";
import { deleteUser, saveUser, setActiveUser, UserRuleError } from "@/lib/users/users";
import { SettingsSchema, type Generation } from "@/types/domain";
import { createTestRepository, disposeRepository, fixedNow } from "../../fixtures/entities";

const now = fixedNow();

function generation(id: string, overrides: Partial<Generation> = {}): Generation {
  return {
    id,
    createdAt: overrides.createdAt ?? now.toISOString(),
    updatedAt: overrides.updatedAt ?? now.toISOString(),
    brief: {
      mode: "live",
      categoryId: "live_ko",
      platform: "instagram",
      fields: {},
      hashtagIds: [],
    },
    engine: "native",
    referenceIds: [],
    status: "draft",
    variants: [
      {
        id: `${id}-v1`,
        kind: "signature",
        selected: true,
        revisions: [
          {
            id: "r1",
            text: "Texte moteur",
            createdAt: now.toISOString(),
            origin: "native",
            factWarnings: [],
          },
          {
            id: "r2",
            text: "Texte du CM",
            createdAt: now.toISOString(),
            origin: "cm_edit",
            factWarnings: [],
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("historique et apprentissage contrôlé", () => {
  it("quatre statuts distincts, texte initial et final, filtres, actions", () => {
    expect(Object.values(GENERATION_STATUS_LABELS)).toEqual([
      "Brouillon",
      "En cours de modification",
      "Validé",
      "Publié",
    ]);
    const g = generation("a");
    expect(initialTextOf(g)).toBe("Texte moteur");
    expect(finalTextOf(g)).toBe("Texte du CM");
    expect(finalTextOf({ ...g, finalText: "Validé tel quel" })).toBe("Validé tel quel");

    const list = [
      generation("old", { createdAt: "2026-01-01T00:00:00.000Z", status: "validated" }),
      generation("new", { status: "published", savedToLibraryId: "w1" }),
      generation("daily", { brief: { ...g.brief, mode: "daily", categoryId: "comm_news" } }),
    ];
    expect(filterHistory(list, {}).map((x) => x.id)).toEqual(["new", "daily", "old"]);
    expect(filterHistory(list, { mode: "daily" }).map((x) => x.id)).toEqual(["daily"]);
    expect(filterHistory(list, { status: "validated" }).map((x) => x.id)).toEqual(["old"]);
    // Seules les validées ou publiées non versées attendent « Ajouter comme référence ».
    expect(pendingReferences(list).map((x) => x.id)).toEqual(["old"]);
    expect(statusActions("draft")).toEqual(["validate", "publish"]);
    expect(statusActions("published")).toEqual([]);
  });
});

describe("dashboard", () => {
  it("5 dernières générations et publications, références réelles et fictives, répartition", async () => {
    const wordings = await Promise.all(
      ["live", "live", "daily"].map((mode, i) =>
        createWording(
          {
            text: `Texte ${i}`,
            mode: mode as "live" | "daily",
            categoryId: mode === "live" ? "live_ko" : "comm_news",
            platform: "instagram",
            source: "manual",
          },
          new Date(now.getTime() + i * 1000),
        ),
      ),
    );
    const demo = await createWording({
      text: "Démo",
      mode: "live",
      categoryId: "live_ko",
      platform: "instagram",
      source: "demo",
      isDemo: true,
    });
    const stats = dashboardStats(
      Array.from({ length: 7 }, (_, i) =>
        generation(`g${i}`, { createdAt: new Date(now.getTime() + i).toISOString() }),
      ),
      [...wordings, demo],
    );
    expect(stats.lastGenerations.map((g) => g.id)).toEqual(["g6", "g5", "g4", "g3", "g2"]);
    expect(stats.references).toEqual({ real: 3, demo: 1 });
    expect(stats.split).toEqual({ live: 2, daily: 1 });
    expect(livePercent(stats.split)).toBe(67);
    expect(livePercent({ live: 0, daily: 0 })).toBe(0);
  });
});

describe("exports", () => {
  it("CSV : BOM UTF-8, accents et emojis intacts, réimportable sans correspondance", async () => {
    const w = await createWording({
      text: "💥 KO à Besançon ; « crack » !\nDeuxième ligne",
      mode: "live",
      categoryId: "live_ko",
      platform: "facebook",
      source: "manual",
      fighterIds: ["f1"],
      tags: ["soirée"],
    });
    const demo = await createWording({
      text: "Démo",
      mode: "live",
      categoryId: "live_ko",
      platform: "instagram",
      source: "demo",
      isDemo: true,
    });
    const csv = libraryCsv([w, demo], {
      fighters: [
        {
          id: "f1",
          firstName: "Karim",
          lastName: "Fictif",
          fightHistory: [],
          updatedAt: now.toISOString(),
        },
      ],
      events: [],
    });
    expect(csv.startsWith(UTF8_BOM)).toBe(true);
    expect(csv).not.toContain("Démo");
    const table = parseCsv(csv);
    expect(needsMapping(table.headers, suggestMapping(table.headers))).toBe(false);
    const [record] = recordsFromTable(table, suggestMapping(table.headers));
    expect(record).toMatchObject({
      text: "💥 KO à Besançon ; « crack » !\nDeuxième ligne",
      categoryId: "live_ko",
      platform: "facebook",
      fighters: ["Karim Fictif"],
      tags: ["soirée"],
    });
    expect(Papa.parse(csv.slice(1), { delimiter: ";" }).data[0]).toHaveLength(12);
  });

  it("JSON relu à l'identique ; champ interdit et fichier étranger refusés", () => {
    expect(exportFileName("sauvegarde", "json", new Date(2026, 10, 24, 9, 5))).toBe(
      "hexagone-studio-sauvegarde-2026-11-24-0905.json",
    );
    const snapshot = {
      app: "hexagone-social-studio" as const,
      schemaVersion: 1,
      exportedAt: now.toISOString(),
      tables: {
        wordings: [],
        fighters: [],
        events: [],
        liveSessions: [],
        generations: [],
        hashtagGroups: [],
        signatures: [],
        rules: [],
        styleProfiles: [],
        users: [],
        blobs: [],
      },
      meta: { settings: SettingsSchema.parse({}) },
    };
    const preview = readSnapshotText(snapshotJson(snapshot));
    expect(preview).toMatchObject({ ok: true, counts: { wordings: 0 } });
    expect(readSnapshotText('{"app":"hexagone-social-studio","apiKey":"x"}')).toMatchObject({
      ok: false,
    });
    expect(readSnapshotText("pas du json")).toEqual({
      ok: false,
      error: "Ce fichier n'est pas un JSON lisible.",
    });
    expect(readSnapshotText('{"app":"autre"}').ok).toBe(false);
  });

  it("Excel : une feuille par table, images non recopiées", async () => {
    expect(tableRows("blobs", [{ id: "logo", data: "AAAA", size: 3 }]).rows[0]).toEqual([
      "logo",
      "(image, 3 octets)",
      3,
    ]);
    const repository = createTestRepository();
    await runSeed(repository, now);
    const buffer = await snapshotWorkbook(await repository.exportAll());
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    expect(workbook.worksheets.map((s) => s.name)).toContain("Bibliothèque");
    expect(workbook.worksheets).toHaveLength(12);
    expect(workbook.getWorksheet("Bibliothèque")!.rowCount).toBe(7);
    await disposeRepository(repository);
  });
});

describe("maintenance, préférences, profils", () => {
  let repository: DexieRepository;
  beforeEach(async () => {
    repository = createTestRepository();
    await runSeed(repository, now);
  });
  afterEach(async () => {
    await disposeRepository(repository);
  });

  it("suppression des exemples fictifs", async () => {
    expect(await deleteDemoWordings(repository)).toBe(6);
    expect(await repository.wordings.count()).toBe(0);
  });

  it("réinitialisation : sauvegarde d'abord, puis état du premier lancement", async () => {
    await repository.saveSettings({ ...(await repository.getSettings()), accountName: "autre" });
    await repository.fighters.put({
      id: "x",
      firstName: "A",
      lastName: "B",
      fightHistory: [],
      updatedAt: now.toISOString(),
    });
    let backedUp = 0;
    await resetApplication(
      repository,
      async (current) => {
        backedUp = current.tables.fighters.length;
      },
      now,
    );
    expect(backedUp).toBe(2);
    expect(await repository.fighters.get("x")).toBeUndefined();
    expect(await repository.wordings.count()).toBe(6);
    expect((await repository.getSettings()).accountName).toBe("hexagonemma");
  });

  it("options rapides, contrôles, logo", () => {
    expect(moveItem(["R1", "R2", "R3"], 2, 0)).toEqual(["R3", "R1", "R2"]);
    expect(addOption(["KO"], " ko ")).toEqual(["KO"]);
    expect(addOption(["KO"], " Arbitrage ")).toEqual(["KO", "Arbitrage"]);
    const settings = SettingsSchema.parse({});
    expect(preferencesErrors(settings)).toEqual({});
    expect(preferencesErrors({ ...settings, igTruncation: 20, accountName: "" })).toEqual({
      igTruncation: "Coupure Instagram : entre 60 et 300 caractères.",
      accountName: "Le nom de compte est requis.",
    });
    expect(logoError({ type: "image/gif", size: 10 })).toBeDefined();
    expect(logoError({ type: "image/png", size: 600 * 1024 })).toBe(
      "Logo trop lourd : 512 Ko au maximum.",
    );
    expect(logoError({ type: "image/png", size: 1000 })).toBeUndefined();
  });

  it("profils : toujours un administrateur, profil actif protégé", async () => {
    const [admin] = await repository.users.list();
    await expect(
      saveUser(repository, { id: admin!.id, name: "CM", role: "cm" }),
    ).rejects.toBeInstanceOf(UserRuleError);
    const cm = await saveUser(repository, { name: " Léa ", role: "cm" });
    expect(cm.name).toBe("Léa");
    await expect(deleteUser(repository, admin!.id)).rejects.toThrow("profil actif");
    await setActiveUser(repository, cm.id);
    await expect(deleteUser(repository, admin!.id)).rejects.toThrow("administrateur");
    await setActiveUser(repository, admin!.id);
    await deleteUser(repository, cm.id);
    expect(await repository.users.count()).toBe(1);
  });
});
