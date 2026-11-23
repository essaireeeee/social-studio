import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getCategory } from "@/lib/categories/registry";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import { runSeed } from "@/lib/database/seed";
import { createWording } from "@/lib/database/wording-factory";
import { styleParameters } from "@/lib/editorial/profile-service";
import { DEFAULT_EDITORIAL_RULES } from "@/lib/editorial/rules";
import { buildAllowedFacts, factGuard } from "@/lib/generation/fact-guard";
import { buildBriefContext } from "@/lib/generation/native/context";
import { generateNative } from "@/lib/generation/native/engine";
import { saveHook, loadHookBank } from "@/lib/generation/native/hooks";
import { generateNativeForBrief } from "@/lib/generation/service";
import { LocalBm25Retriever, buildRetrievalQuery } from "@/lib/retrieval/retriever";
import type { Brief } from "@/types/domain";
import { NOW, createTestRepository, disposeRepository, fixedNow } from "../../fixtures/entities";
import { RETRIEVAL_FIGHTERS, buildRetrievalCorpus } from "../../fixtures/retrieval-corpus";

let repository: DexieRepository;
let retriever: LocalBm25Retriever;

const koBrief: Brief = {
  mode: "live",
  categoryId: "live_ko",
  platform: "instagram",
  fields: { winner: "Karim Fictif", loser: "Tom Essai", method: "KO", round: "R2" },
  hashtagIds: ["hashtags-official"],
};

beforeEach(async () => {
  repository = createTestRepository();
  await runSeed(repository, fixedNow());
  await repository.fighters.bulkPut(RETRIEVAL_FIGHTERS);
  const corpus = await buildRetrievalCorpus();
  await repository.wordings.bulkPut(corpus);
  retriever = new LocalBm25Retriever();
  retriever.load(await repository.wordings.list());
});

afterEach(async () => {
  await disposeRepository(repository);
});

describe("generateNativeForBrief", () => {
  it("enregistre une génération brouillon, signature sélectionnée, références du même mode", async () => {
    const { generation, references, result } = await generateNativeForBrief(
      repository,
      retriever,
      koBrief,
      {
        now: fixedNow(),
      },
    );
    expect(await repository.generations.get(generation.id)).toEqual(generation);
    expect(generation).toMatchObject({ status: "draft", engine: "native" });
    expect(generation.variants.map((v) => [v.kind, v.selected, v.revisions[0]!.origin])).toEqual([
      ["signature", true, "native"],
      ["punchy", false, "native"],
      ["storytelling", false, "native"],
    ]);
    expect(references.length).toBeGreaterThan(0);
    expect(references.every((r) => r.wording.mode === "live" && !r.wording.isDemo)).toBe(true);
    expect(generation.referenceIds).toEqual(references.map((r) => r.wording.id));
    for (const v of result.variants) {
      expect(v.factWarnings).toEqual([]);
      expect(v.text).toContain("#HexagoneMMA");
    }
  });

  it("prend le contexte de la Session Live active", async () => {
    await repository.liveSessions.put({
      id: "s",
      eventName: "HEXAGONE MMA",
      eventNumber: 12,
      city: "Paris",
      startedAt: NOW,
      active: true,
    });
    const outcomes = await Promise.all(
      [0, 1, 2, 3].map((count) =>
        generateNativeForBrief(repository, retriever, koBrief, {
          regenerationCount: count,
          persist: false,
        }),
      ),
    );
    const signatures = outcomes.map(
      (o) => o.result.variants.find((v) => v.kind === "signature")!.text,
    );
    expect(signatures.some((text) => text.includes("HEXAGONE MMA 12"))).toBe(true);
  });

  it("signale une signature incomplète au lieu de l'ajouter", async () => {
    const { signatureIssue, result } = await generateNativeForBrief(
      repository,
      retriever,
      { ...koBrief, signatureId: "signature-event" },
      { persist: false },
    );
    expect(signatureIssue).toEqual({
      missing: ["date", "salle", "ville"],
      needsConfirmedSchedule: false,
    });
    for (const v of result.variants) expect(v.text).not.toContain("Prenez vos places");
  });

  it("jamais de CTA billetterie sur une défaite", async () => {
    const { result } = await generateNativeForBrief(
      repository,
      retriever,
      {
        mode: "live",
        categoryId: "live_defeat",
        platform: "instagram",
        fields: { fighter: "Tom Essai", opponent: "Karim Fictif" },
        hashtagIds: [],
        cta: "Prenez vos places pour la prochaine soirée !",
      },
      { persist: false },
    );
    for (const v of result.variants) expect(v.text).not.toMatch(/places/i);
  });

  it("garde une accroche et la réutilise comme patron", async () => {
    const category = getCategory("live_ko")!;
    const context = buildBriefContext(koBrief, category, {
      fighters: RETRIEVAL_FIGHTERS,
      hashtags: [],
    });
    const saved = await saveHook(repository, {
      mode: "live",
      categoryId: "live_ko",
      text: "⚡ KARIM FICTIF frappe fort face à Tom Essai",
      vars: context.vars,
    });
    expect(saved.pattern).toBe("{E} {WINNER_UPPER} frappe fort face à {loser}");
    expect(await loadHookBank(repository)).toHaveLength(1);
    // Même accroche gardée deux fois : pas de doublon.
    await saveHook(repository, {
      mode: "live",
      categoryId: "live_ko",
      text: "⚡ KARIM FICTIF frappe fort face à Tom Essai",
      vars: context.vars,
    });
    expect(await loadHookBank(repository)).toHaveLength(1);
  });
});

describe("critère de performance (section 10.7)", () => {
  it("génération native en moins de 50 ms pour un corpus de 2 000 wordings", async () => {
    const big = await Promise.all(
      Array.from({ length: 2000 }, (_, i) =>
        createWording(
          {
            id: `perf-${i}`,
            text: `💥 KO de Karim Fictif au R${(i % 5) + 1} ! Publication ${i} de la soirée ${i % 40}.\n\nLa salle explose.\n\n#HexagoneMMA`,
            mode: i % 2 ? "live" : "daily",
            categoryId: i % 2 ? "live_ko" : "daily_fight_announce",
            platform: "instagram",
            source: "manual",
          },
          fixedNow(),
        ),
      ),
    );
    const local = new LocalBm25Retriever();
    local.load(big);
    const category = getCategory("live_ko")!;
    const params = styleParameters(undefined, "live");

    const once = (count: number) => {
      const started = performance.now();
      const references = local.rank(
        buildRetrievalQuery(koBrief, { fighters: RETRIEVAL_FIGHTERS, now: fixedNow() }),
      );
      const context = buildBriefContext(koBrief, category, {
        fighters: RETRIEVAL_FIGHTERS,
        hashtags: ["#HexagoneMMA"],
      });
      generateNative({
        brief: koBrief,
        category,
        context,
        style: { params },
        references: references.map((r) => ({ id: r.wording.id, text: r.wording.text })),
        recentHooks: [],
        rules: DEFAULT_EDITORIAL_RULES,
        frenchSpacing: true,
        regenerationCount: count,
      });
      return performance.now() - started;
    };
    once(0); // préchauffage (compilation à la volée)
    const timings = [1, 2, 3, 4, 5].map(once).sort((a, b) => a - b);
    expect(timings[2]).toBeLessThan(50);
  });
});

describe("Fact Guard : cas limites relevés en test de charge", () => {
  it("« 2E » en capitales est un nombre, pas un nom propre", () => {
    const allowed = buildAllowedFacts(["2e round", "Ana Exemple"]);
    expect(factGuard("ANA EXEMPLE AU 2E ROUND", { allowed, vocabulary: new Set(["au"]) })).toEqual(
      [],
    );
  });
});
