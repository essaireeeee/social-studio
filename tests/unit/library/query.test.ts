import { describe, expect, it } from "vitest";
import { createWording, type WordingInput } from "@/lib/database/wording-factory";
import {
  createLibraryIndex,
  libraryTags,
  parseSearch,
  queryLibrary,
  type LibraryFilters,
} from "@/lib/library/query";
import type { Wording } from "@/types/domain";

const base: Omit<WordingInput, "text"> = {
  mode: "live",
  categoryId: "live_ko",
  platform: "instagram",
  source: "manual",
};

async function make(text: string, overrides: Partial<WordingInput> = {}, at = "2026-01-01") {
  return createWording({ ...base, text, ...overrides }, new Date(`${at}T10:00:00.000Z`));
}

async function library(): Promise<Wording[]> {
  return Promise.all([
    make("💥 KO de Karim Fictif au premier round, la salle explose", {
      id: "ko",
      fighterIds: ["karim"],
      eventId: "ev12",
      date: "2026-03-14",
      tags: ["soirée"],
    }),
    make("Soumission de Ana Exemple, étranglement arrière au deuxième round", {
      id: "sub",
      categoryId: "live_sub",
      fighterIds: ["ana"],
      date: "2026-03-15",
      status: "published",
    }),
    make("Billetterie ouverte : prenez vos places pour la prochaine soirée", {
      id: "ticket",
      mode: "daily",
      categoryId: "daily_ticketing",
      platform: "facebook",
      source: "csv",
      date: "2026-02-01",
      tags: ["billetterie", "soirée"],
    }),
    make("KO spectaculaire dans la cage, exemple fourni", { id: "demo", isDemo: true }),
    make("Sans date : KO de Tom Essai", { id: "nodate" }, "2026-01-05"),
  ]);
}

async function ids(filters: LibraryFilters, sort: "date" | "relevance" | "updated" = "date") {
  const index = createLibraryIndex(await library());
  return queryLibrary(index, filters, sort).wordings.map((w) => w.id);
}

describe("requête de la bibliothèque", () => {
  it("les démos sont exclues par défaut, incluses sur demande", async () => {
    expect(await ids({})).not.toContain("demo");
    expect(await ids({ includeDemo: true })).toContain("demo");
  });

  it("filtres combinés : mode, catégorie, combattant, événement, plateforme, tag, statut, source", async () => {
    expect(await ids({ mode: "daily" })).toEqual(["ticket"]);
    expect(await ids({ categoryId: "live_sub" })).toEqual(["sub"]);
    expect(await ids({ fighterId: "karim" })).toEqual(["ko"]);
    expect(await ids({ eventId: "ev12" })).toEqual(["ko"]);
    expect(await ids({ platform: "facebook" })).toEqual(["ticket"]);
    expect(await ids({ tag: "soirée" })).toEqual(["ko", "ticket"]);
    expect(await ids({ status: "published" })).toEqual(["sub"]);
    expect(await ids({ source: "csv" })).toEqual(["ticket"]);
    expect(await ids({ mode: "live", tag: "billetterie" })).toEqual([]);
  });

  it("plage de dates incluse, date de création à défaut de date de publication", async () => {
    expect(await ids({ dateFrom: "2026-03-01", dateTo: "2026-03-14" })).toEqual(["ko"]);
    expect(await ids({ dateTo: "2026-01-31" })).toEqual(["nodate"]);
  });

  it("recherche par mots (BM25), insensible aux accents, tri par pertinence", async () => {
    expect(await ids({ text: "etranglement" })).toEqual(["sub"]);
    const byRelevance = await ids({ text: "KO round" }, "relevance");
    expect(byRelevance[0]).toBe("ko");
    expect(byRelevance).toEqual(expect.arrayContaining(["ko", "nodate", "sub"]));
  });

  it("recherche exacte entre guillemets droits ou français", async () => {
    expect(await ids({ text: '"premier round"' })).toEqual(["ko"]);
    expect(await ids({ text: "« prochaine soirée »" })).toEqual(["ticket"]);
    expect(await ids({ text: '"round premier"' })).toEqual([]);
    expect(parseSearch('KO "premier round" « la salle »')).toEqual({
      phrases: ["premier round", "la salle"],
      words: "KO",
    });
  });

  it("tri par date de publication (récent d'abord) ou par dernière modification", async () => {
    expect(await ids({})).toEqual(["sub", "ko", "ticket", "nodate"]);
    const wordings = await library();
    wordings[3] = { ...wordings[3]!, updatedAt: "2026-06-01T00:00:00.000Z" };
    wordings[2] = { ...wordings[2]!, updatedAt: "2026-05-01T00:00:00.000Z" };
    const updated = queryLibrary(createLibraryIndex(wordings), { includeDemo: true }, "updated");
    expect(updated.wordings.map((w) => w.id).slice(0, 2)).toEqual(["demo", "ticket"]);
  });

  it("pertinence sans mots : retombe sur le tri par date", async () => {
    expect(await ids({}, "relevance")).toEqual(await ids({}, "date"));
  });

  it("tags existants triés", async () => {
    expect(libraryTags(await library())).toEqual(["billetterie", "soirée"]);
  });
});
