import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import { createWording } from "@/lib/database/wording-factory";
import { runSeed } from "@/lib/database/seed";
import { createClassifier } from "@/lib/import/classifier";
import { commitImport } from "@/lib/import/commit";
import { parseCsv } from "@/lib/import/csv";
import { detectDuplicates, shingles } from "@/lib/import/dedupe";
import { parseExcel } from "@/lib/import/excel";
import { fixMetaEncoding, parseInstagramExport } from "@/lib/import/instagram-export";
import {
  applyToSelected,
  buildRows,
  mergeRows,
  splitRow,
  summarize,
  updateRow,
  withReplace,
} from "@/lib/import/rows";
import { splitPosts } from "@/lib/import/splitter";
import {
  CSV_TEMPLATE,
  needsMapping,
  parseDate,
  recordsFromTable,
  suggestMapping,
} from "@/lib/import/table";
import { createTestRepository, disposeRepository, fixedNow } from "../../fixtures/entities";

const fixture = (name: string) =>
  readFileSync(path.join(process.cwd(), "tests/fixtures/import", name), "utf8");

const classify = createClassifier();
const ctx = { classify, library: [] };

describe("collage en masse (critère : 20 détectés, 2 doublons)", () => {
  it("le séparateur === découpe 20 publications", () => {
    expect(splitPosts(fixture("paste-20.txt"))).toHaveLength(20);
    expect(splitPosts("A\n===\n\n=====\nB\n  ===  \nC")).toEqual(["A", "B", "C"]);
  });

  it("catégories proposées, 2 doublons volontaires détectés et décochés", async () => {
    const rows = await buildRows(
      splitPosts(fixture("paste-20.txt")).map((text) => ({ text })),
      ctx,
    );
    expect(rows).toHaveLength(20);
    const expected = [
      "live_ko",
      "live_sub",
      "live_decision",
      "live_crowd",
      "live_walkout",
      "live_champion",
      "live_defense",
      "live_defeat",
      "live_reaction",
      "daily_fight_announce",
      "daily_ticketing",
      "daily_countdown",
      "daily_last_seats",
      "media_interview",
      "media_press",
      "media_podcast",
      "comm_partner",
      "comm_statement",
    ];
    expect(rows.slice(0, 18).map((r) => r.categoryId)).toEqual(expected);
    const duplicates = rows.filter((r) => r.duplicate.kind !== "new");
    expect(duplicates.map((r) => rows.indexOf(r))).toEqual([18, 19]);
    expect(duplicates.every((r) => !r.selected)).toBe(true);
    expect(duplicates[0]!.duplicate).toMatchObject({
      kind: "exact",
      of: rows[2]!.key,
      inBatch: true,
    });
    expect(duplicates[1]!.duplicate).toMatchObject({ of: rows[7]!.key, inBatch: true });
    expect(summarize(rows)).toEqual({
      toImport: 18,
      replaced: 0,
      duplicatesIgnored: 2,
      missingCategory: 0,
    });
  });

  it("sous 0,4 de confiance : « À catégoriser »", () => {
    const unknown = classify("Bonne journée à tous.");
    expect(unknown).toMatchObject({ needsReview: true, confidence: 0 });
    expect(unknown.categoryId).toBeUndefined();
    expect(classify("💥 KO !")).toMatchObject({
      categoryId: "live_ko",
      mode: "live",
      needsReview: false,
    });
  });

  it("au-delà de 30 publications catégorisées, les plus proches votent (BM25)", () => {
    const corpus = Array.from({ length: 30 }, (_, i) => ({
      id: `w${i}`,
      text:
        i % 2
          ? "Pesée officielle ce vendredi à la mairie, tous les combattants présents"
          : "Autre sujet sans rapport",
      categoryId: i % 2 ? "daily_faceoff" : "comm_news",
    }));
    const withCorpus = createClassifier(corpus);
    expect(withCorpus("Pesée officielle à la mairie vendredi")).toMatchObject({
      categoryId: "daily_faceoff",
    });
  });
});

describe("doublons", () => {
  it("exact par hash, proche par suites de 3 mots ≥ 0,85, contre la bibliothèque", () => {
    const text =
      "Karim Fictif remporte son combat au premier round devant une salle comble et en feu";
    const status = detectDuplicates(
      [
        { id: "a", text, hash: "h1" },
        { id: "b", text: `${text} ce soir`, hash: "h2" },
        { id: "c", text: "Rien à voir avec le reste", hash: "h3" },
      ],
      [{ id: "lib", text, hash: "h1" }],
    );
    expect(status.get("a")).toEqual({ kind: "exact", of: "lib", inBatch: false });
    expect(status.get("b")).toMatchObject({ kind: "near", of: "lib", inBatch: false });
    expect(status.get("c")).toEqual({ kind: "new" });
    expect(shingles("Un deux")).toEqual(new Set(["un deux"]));
  });
});

describe("CSV et Excel (critère : mapping correct, accents préservés)", () => {
  it("en-têtes accentués reconnus, valeurs converties", () => {
    const table = parseCsv(fixture("wordings.csv"));
    const mapping = suggestMapping(table.headers);
    expect(mapping).toEqual({
      texte: 0,
      categorie: 1,
      combattants: 2,
      evenement: 3,
      date: 4,
      reseau: 5,
      lien: 6,
      hashtags: 7,
      tags: 8,
      commentaire: 9,
    });
    expect(needsMapping(table.headers, mapping)).toBe(false);
    const records = recordsFromTable(table, mapping);
    expect(records).toHaveLength(3);
    expect(records[0]).toMatchObject({
      text: "💥 KO de Karim Fictif ! L'arbitre arrête le combat, la foule est debout.",
      categoryId: "live_ko",
      fighters: ["Karim Fictif", "Tom Essai"],
      event: "HEXAGONE MMA 12",
      date: "2026-03-14",
      platform: "instagram",
      hashtags: ["#HexagoneMMA"],
      tags: ["soirée"],
      notes: "Publié à chaud",
    });
    expect(records[1]).toMatchObject({
      categoryId: "daily_fight_announce",
      platform: "facebook",
      notes: "Vérifié par l'équipe",
    });
    expect(records[2]!.text).toBe(
      "🙏 Merci à tous pour cette soirée inoubliable à Besançon. Ça restera gravé !",
    );
  });

  it("en-tête inconnu : écran de correspondance", () => {
    const headers = ["Légende", "Colonne mystère"];
    expect(needsMapping(headers, suggestMapping(headers))).toBe(true);
    expect(needsMapping(["Quoi"], suggestMapping(["Quoi"]))).toBe(true);
  });

  it("dates françaises, modèle CSV relisible", () => {
    expect(parseDate("14/03/26")).toBe("2026-03-14");
    expect(parseDate("31/02/2026")).toBeUndefined();
    const template = parseCsv(CSV_TEMPLATE);
    expect(needsMapping(template.headers, suggestMapping(template.headers))).toBe(false);
  });

  it("Excel : première feuille, mêmes colonnes", async () => {
    const { default: ExcelJS } = await import("exceljs");
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Wordings");
    sheet.addRow(["Texte", "Réseau", "Catégorie"]);
    sheet.addRow(["🎟️ Prenez vos places, ça part très vite !", "X", "Billetterie"]);
    const buffer = await workbook.xlsx.writeBuffer();
    const table = await parseExcel(buffer as ArrayBuffer);
    const records = recordsFromTable(table, suggestMapping(table.headers));
    expect(records).toEqual([
      expect.objectContaining({ text: "🎟️ Prenez vos places, ça part très vite !", platform: "x" }),
    ]);
  });
});

describe("export Instagram (critère : mojibake, emojis restaurés)", () => {
  it("légendes trouvées dans media[].title, title et string_map_data, dates lues", () => {
    const posts = parseInstagramExport(JSON.parse(fixture("instagram-posts.json")));
    expect(posts).toEqual([
      {
        text: "💥 KO de Karim Fictif au premier round ! La salle explose 🔥\n\n#HexagoneMMA",
        date: "2026-03-14",
      },
      {
        text: "🎟️ Billetterie ouverte pour HEXAGONE MMA 13 : prenez vos places, ça part vite !",
        date: "2026-02-25",
      },
      {
        text: "🎙️ Interview d'Ana Exemple : « Je suis prête. » Rendez-vous à l'écoute.",
        date: "2026-02-13",
      },
    ]);
  });

  it("un texte déjà correct n'est jamais altéré", () => {
    expect(fixMetaEncoding("Déjà propre 💥")).toBe("Déjà propre 💥");
    expect(fixMetaEncoding("Prix : 15 € et ½ tarif")).toBe("Prix : 15 € et ½ tarif");
    expect(parseInstagramExport({ foo: [1, 2, 3] })).toEqual([]);
  });
});

describe("vérification et enregistrement", () => {
  let repository: DexieRepository;
  beforeEach(async () => {
    repository = createTestRepository();
    await runSeed(repository, fixedNow());
  });
  afterEach(async () => {
    await disposeRepository(repository);
  });

  it("fusion, scission, action groupée", async () => {
    let rows = await buildRows(
      [{ text: "💥 KO !\n\nSuite du texte" }, { text: "Autre texte" }],
      ctx,
    );
    rows = await splitRow(rows, rows[0]!.key, ctx);
    expect(rows.map((r) => r.text)).toEqual(["💥 KO !", "Suite du texte", "Autre texte"]);
    rows = await mergeRows(rows, rows[1]!.key, rows[2]!.key, ctx);
    expect(rows.map((r) => r.text)).toEqual(["💥 KO !", "Suite du texte\n\nAutre texte"]);
    rows = updateRow(rows, rows[0]!.key, { categoryId: "live_sub" });
    expect(rows[0]).toMatchObject({ categoryId: "live_sub", mode: "live", needsReview: false });
    rows = updateRow(rows, rows[0]!.key, { mode: "daily" });
    expect(rows[0]).toMatchObject({ categoryId: undefined, mode: "daily", needsReview: true });
    rows = applyToSelected(rows, { categoryId: "comm_news", platform: "facebook" });
    expect(
      rows.every(
        (r) => r.categoryId === "comm_news" && r.mode === "daily" && r.platform === "facebook",
      ),
    ).toBe(true);
  });

  it("doublon exact de la bibliothèque : ignoré, ou remplacé après confirmation", async () => {
    const existing = await createWording({
      text: "💥 KO de Karim Fictif !",
      mode: "live",
      categoryId: "live_ko",
      platform: "instagram",
      source: "manual",
    });
    await repository.wordings.put(existing);
    const library = [{ id: existing.id, text: existing.text, hash: existing.contentHash }];
    const rows = await buildRows(
      [{ text: "💥 KO de Karim Fictif !" }, { text: "🐍 Soumission de Ana Exemple" }],
      {
        classify,
        library,
      },
    );
    expect(summarize(rows)).toMatchObject({ toImport: 1, duplicatesIgnored: 1 });
    const ignored = await commitImport(repository, rows, { source: "bulk" });
    expect(ignored).toMatchObject({ created: 1, replaced: 0, skipped: 1 });

    const forced = withReplace(rows, true);
    expect(summarize(forced, true)).toMatchObject({
      toImport: 2,
      replaced: 1,
      duplicatesIgnored: 0,
    });
    // Sans confirmation de « Remplacer », un doublon exact coché n'est jamais écrit.
    expect(summarize(forced, false)).toMatchObject({ toImport: 1, duplicatesIgnored: 1 });
    const replaced = await commitImport(repository, forced, { source: "bulk", replace: true });
    expect(replaced.replaced).toBe(1);
    expect((await repository.wordings.get(existing.id))!.source).toBe("bulk");
  });

  it("au-delà de 10 publications importées, le profil du mode est recalculé (proposé)", async () => {
    const rows = await buildRows(
      Array.from({ length: 12 }, (_, i) => ({
        text: `💥 KO numéro ${i} de la soirée, la salle est debout.`,
      })),
      ctx,
    );
    const result = await commitImport(repository, rows, { source: "bulk", now: fixedNow() });
    expect(result).toMatchObject({ created: 12, profilesRecomputed: 1 });
    const profiles = await repository.styleProfiles.list();
    expect(profiles.some((p) => p.mode === "live" && p.status === "proposed")).toBe(true);
  });
});
