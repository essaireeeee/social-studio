import { beforeAll, describe, expect, it } from "vitest";
import { getCategoriesByMode } from "@/lib/categories/registry";
import { createWording } from "@/lib/database/wording-factory";
import { Bm25Index } from "@/lib/retrieval/index";
import {
  LocalBm25Retriever,
  REFERENCE_LIMITS,
  buildRetrievalQuery,
  type QueryContext,
} from "@/lib/retrieval/retriever";
import type { Brief, Wording } from "@/types/domain";
import { NOW } from "../../fixtures/entities";
import { KARIM, RETRIEVAL_FIGHTERS, buildRetrievalCorpus } from "../../fixtures/retrieval-corpus";

const now = new Date(NOW);
let corpus: Wording[];
let retriever: LocalBm25Retriever;

beforeAll(async () => {
  corpus = await buildRetrievalCorpus();
  retriever = new LocalBm25Retriever();
  retriever.load(corpus);
});

const brief = (patch: Partial<Brief> & Pick<Brief, "categoryId">): Brief => ({
  mode: "live",
  platform: "instagram",
  fields: {},
  hashtagIds: [],
  ...patch,
});
const rank = (b: Brief, context: QueryContext = {}) =>
  retriever.rank(buildRetrievalQuery(b, { fighters: RETRIEVAL_FIGHTERS, now, ...context }));
const ids = (b: Brief, context: QueryContext = {}) => rank(b, context).map((r) => r.wording.id);

describe("critères de la section 9", () => {
  it("un brief live_ko avec le combattant X classe en premier un post live_ko mentionnant X", () => {
    const results = rank(
      brief({ categoryId: "live_ko", fields: { winner: "Karim Fictif", loser: "Jean Inconnu" } }),
    );
    expect(results[0]?.wording.id).toBe("ko-karim");
    expect(results[0]?.wording.categoryId).toBe("live_ko");
  });

  it("aucun post DAILY n'est jamais retourné pour un brief LIVE", () => {
    const names = ["Karim Fictif", "Tom Essai", "Ali Brouillon", "Le Marteau", "Inconnu"];
    for (const category of getCategoriesByMode("live")) {
      for (const [i, name] of names.entries()) {
        const fields = {
          winner: name,
          loser: names[(i + 1) % names.length],
          fighter: name,
          highlight: "KO combat officiel",
        };
        const results = rank(
          brief({ categoryId: category.id, fields, platform: i % 2 ? "x" : "instagram" }),
        );
        expect(results.every((r) => r.wording.mode === "live")).toBe(true);
      }
    }
  });

  it("et réciproquement, un brief DAILY ne reçoit que des posts DAILY", () => {
    const results = rank(
      brief({
        mode: "daily",
        categoryId: "daily_fight_announce",
        fields: { fighterA: "Karim Fictif", fighterB: "Tom Essai" },
      }),
    );
    expect(results.map((r) => r.wording.id).sort()).toEqual(["daily-karim", "media-karim"]);
  });
});

describe("filtre dur", () => {
  it("exclut les démos sauf option, et toujours les posts qui ne sont pas des références", () => {
    const b = brief({ categoryId: "live_ko", fields: { winner: "Karim Fictif" } });
    expect(ids(b)).not.toContain("demo-ko-karim");
    expect(ids(b, { includeDemo: true })).toContain("demo-ko-karim");
    expect(ids(b, { includeDemo: true })).not.toContain("nonref-ko-karim");
  });

  it("retire les références exclues par le CM", () => {
    const b = brief({ categoryId: "live_ko", fields: { winner: "Karim Fictif" } });
    expect(ids(b, { excludeIds: ["ko-karim"] })).not.toContain("ko-karim");
  });
});

describe("score", () => {
  it("donne la raison principale de chaque référence", () => {
    const results = rank(brief({ categoryId: "live_ko", fields: { winner: "Karim Fictif" } }));
    const reason = (id: string) => results.find((r) => r.wording.id === id)?.reason;
    expect(reason("ko-tom")).toBe("Même catégorie");
    expect(reason("result-ali")).toBe("Catégorie voisine");
    // 0,20 (combattant présent) l'emporte sur 0,15 (catégorie voisine).
    expect(reason("sub-karim")).toBe("Même combattant");
    const crowd = rank(
      brief({ categoryId: "live_crowd", fields: { highlight: "étranglement arrière" } }),
    );
    expect(crowd.find((r) => r.wording.id === "sub-karim")?.reason).toBe("Contenu proche");
  });

  it("repère un combattant cité dans le texte, même sans fiche liée", () => {
    const results = rank(brief({ categoryId: "live_sub", fields: { winner: "Karim Fictif" } }));
    const sub = results.find((r) => r.wording.id === "sub-karim")!;
    expect(results[0]?.wording.id).toBe("sub-karim");
    expect(sub.breakdown.fighterOverlap).toBeCloseTo(0.2);
  });

  it("pénalise une référence utilisée dans les 5 dernières générations", () => {
    // Sans combattant : les deux premiers KO sont presque à égalité.
    const b = brief({ categoryId: "live_ko" });
    const base = rank(b);
    const top = base[0]!;
    const penalized = rank(b, {
      recentGenerations: [{ createdAt: NOW, referenceIds: [top.wording.id] }],
    });
    const after = penalized.find((r) => r.wording.id === top.wording.id)!;
    expect(after.breakdown.usedRecently).toBeCloseTo(-0.15);
    expect(after.score).toBeCloseTo(top.score - 0.15);
    expect(penalized[0]?.wording.id).not.toBe(top.wording.id);
  });

  it("applique les poids des réglages", () => {
    const b = brief({
      categoryId: "live_crowd",
      platform: "x",
      fields: { highlight: "salle debout" },
    });
    expect(ids(b)[0]).toBe("crowd");
    const noCategory = rank(b, {
      weights: { sameCategory: 0, samePlatform: 0, textSimilarity: 0 },
    });
    expect(noCategory[0]?.breakdown.sameCategory).toBe(0);
  });

  it("favorise une publication récente à score égal par ailleurs", async () => {
    const recent = await createWording(
      {
        id: "ko-recent",
        text: "💥 KO éclair !",
        mode: "live",
        categoryId: "live_ko",
        platform: "instagram",
        source: "manual",
        date: NOW.slice(0, 10),
      },
      now,
    );
    const old = await createWording(
      {
        id: "ko-old",
        text: "💥 KO éclair !!",
        mode: "live",
        categoryId: "live_ko",
        platform: "instagram",
        source: "manual",
        date: "2023-01-01",
      },
      now,
    );
    const local = new LocalBm25Retriever();
    local.load([old, recent]);
    const results = local.rank(buildRetrievalQuery(brief({ categoryId: "live_ko" }), { now }));
    expect(results.map((r) => r.wording.id)).toEqual(["ko-recent", "ko-old"]);
  });
});

describe("sélection", () => {
  it("renvoie entre 5 et 10 références, au plus 3 de même structure", async () => {
    const many = await Promise.all(
      Array.from({ length: 30 }, (_, i) =>
        createWording(
          {
            id: `bulk-${i}`,
            text:
              i % 2 ? `💥 KO numéro ${i} !\n\nCorps ${i}.\n\n#HexagoneMMA` : `💥 KO numéro ${i} !`,
            mode: "live",
            categoryId: "live_ko",
            platform: "instagram",
            source: "manual",
          },
          now,
        ),
      ),
    );
    const local = new LocalBm25Retriever();
    local.load(many);
    const results = local.rank(buildRetrievalQuery(brief({ categoryId: "live_ko" }), { now }));
    expect(results.length).toBeLessThanOrEqual(REFERENCE_LIMITS.max);
    expect(results.length).toBeGreaterThanOrEqual(REFERENCE_LIMITS.min);
    const perStructure = new Map<string, number>();
    for (const r of results)
      perStructure.set(r.fingerprint, (perStructure.get(r.fingerprint) ?? 0) + 1);
    expect(Math.max(...perStructure.values())).toBeLessThanOrEqual(3);
  });

  it("renvoie moins de 5 références si le corpus est petit", () => {
    expect(rank(brief({ mode: "daily", categoryId: "media_press" })).length).toBe(2);
  });

  it("ne renvoie rien sans corpus dans le mode", () => {
    const empty = new LocalBm25Retriever();
    expect(empty.rank(buildRetrievalQuery(brief({ categoryId: "live_ko" }), { now }))).toEqual([]);
  });
});

describe("requête construite depuis le brief", () => {
  it("relie un nom saisi à sa fiche, garde un nom libre tel quel, sans doublon", () => {
    const query = buildRetrievalQuery(
      brief({
        categoryId: "live_result",
        fields: {
          fighter1: "karim fictif",
          fighter2: "Jean Inconnu",
          winner: "karim fictif",
          method: "KO",
        },
      }),
      { fighters: RETRIEVAL_FIGHTERS },
    );
    expect(query.fighters).toEqual([
      { id: KARIM.id, names: ["Karim Fictif", "Fictif", "Le Marteau"] },
      { names: ["Jean Inconnu"] },
    ]);
    expect(query.queryText).toContain("Résultat combat");
  });

  it("prend l'événement de la Session Live en mode LIVE", () => {
    const query = buildRetrievalQuery(brief({ categoryId: "live_ko" }), {
      liveSession: {
        id: "s1",
        eventName: "HEXAGONE MMA",
        eventNumber: 12,
        startedAt: NOW,
        active: true,
      },
    });
    expect(query.event).toEqual({ id: undefined, names: ["HEXAGONE MMA 12"] });
  });

  it("ne retient que les références des 5 dernières générations", () => {
    const generations = Array.from({ length: 7 }, (_, i) => ({
      createdAt: `2026-11-1${i}T10:00:00.000Z`,
      referenceIds: [`ref-${i}`],
    }));
    const query = buildRetrievalQuery(brief({ categoryId: "live_ko" }), {
      recentGenerations: generations,
    });
    expect(query.recentlyUsedIds.sort()).toEqual(["ref-2", "ref-3", "ref-4", "ref-5", "ref-6"]);
  });
});

describe("index BM25", () => {
  it("classe d'abord les documents qui contiennent les termes rares", () => {
    const index = new Bm25Index();
    index.upsert("a", ["ko", "droite", "salle"]);
    index.upsert("b", ["ko", "soumission"]);
    index.upsert("c", ["ko", "salle", "salle"]);
    const scores = index.score(["soumission", "ko"]);
    expect([...scores.entries()].sort((x, y) => y[1] - x[1])[0]?.[0]).toBe("b");
    expect(index.idf("soumission")).toBeGreaterThan(index.idf("ko"));
  });

  it("une mise à jour incrémentale donne les mêmes scores qu'une reconstruction", () => {
    const incremental = new Bm25Index();
    incremental.upsert("a", ["ko", "salle"]);
    incremental.upsert("b", ["vieux", "texte"]);
    incremental.upsert("a", ["ko", "droite"]);
    incremental.remove("b");
    incremental.upsert("c", ["droite", "salle"]);
    const rebuilt = new Bm25Index();
    rebuilt.upsert("a", ["ko", "droite"]);
    rebuilt.upsert("c", ["droite", "salle"]);
    expect(incremental.score(["droite", "ko"])).toEqual(rebuilt.score(["droite", "ko"]));
  });

  it("le retriever ne réindexe que ce qui a changé", () => {
    const local = new LocalBm25Retriever();
    local.load(corpus);
    const changed = { ...corpus[0]!, text: "Texte modifié", updatedAt: "2026-11-21T00:00:00.000Z" };
    expect(local.sync([changed, ...corpus.slice(1, -1)])).toEqual({ upserted: 1, removed: 1 });
    expect(local.size).toBe(corpus.length - 1);
  });
});

describe("performance", () => {
  it("classe 2 000 publications en moins de 50 ms", async () => {
    const big = await Promise.all(
      Array.from({ length: 2000 }, (_, i) =>
        createWording(
          {
            id: `perf-${i}`,
            text: `💥 KO de Karim Fictif au R${(i % 5) + 1} ! Publication ${i} sur la soirée ${i % 40}.\n\n#HexagoneMMA`,
            mode: i % 2 ? "live" : "daily",
            categoryId: i % 2 ? "live_ko" : "daily_fight_announce",
            platform: "instagram",
            source: "manual",
          },
          now,
        ),
      ),
    );
    const local = new LocalBm25Retriever();
    local.load(big);
    const query = buildRetrievalQuery(
      brief({ categoryId: "live_ko", fields: { winner: "Karim Fictif" } }),
      {
        fighters: RETRIEVAL_FIGHTERS,
        now,
      },
    );
    const timings = Array.from({ length: 5 }, () => {
      const start = performance.now();
      local.rank(query);
      return performance.now() - start;
    }).sort((a, b) => a - b);
    expect(timings[2]).toBeLessThan(50);
  });
});
