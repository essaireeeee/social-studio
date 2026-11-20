import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import { runSeed } from "@/lib/database/seed";
import { connectRetriever, findReferences, type ConnectedRetriever } from "@/lib/retrieval/service";
import type { Brief } from "@/types/domain";
import {
  NOW,
  createTestRepository,
  disposeRepository,
  fixedNow,
  sampleWording,
} from "../../fixtures/entities";
import { KARIM, RETRIEVAL_FIGHTERS, buildRetrievalCorpus } from "../../fixtures/retrieval-corpus";

let repository: DexieRepository;
let connected: ConnectedRetriever;

const koBrief: Brief = {
  mode: "live",
  categoryId: "live_ko",
  platform: "instagram",
  fields: { winner: "Karim Fictif" },
  hashtagIds: [],
};

beforeEach(async () => {
  repository = createTestRepository();
  await runSeed(repository, fixedNow());
  await repository.fighters.bulkPut(RETRIEVAL_FIGHTERS);
  await repository.wordings.bulkPut(await buildRetrievalCorpus());
  connected = await connectRetriever(repository);
  await connected.ready;
});

afterEach(async () => {
  connected.disconnect();
  await disposeRepository(repository);
});

describe("index tenu à jour en direct", () => {
  it("indexe la bibliothèque au chargement, démos comprises (filtrées à la requête)", () => {
    expect(connected.retriever.size).toBe(16); // 10 du corpus + 6 démos du seed
  });

  it("suit les ajouts, modifications et suppressions de la base", async () => {
    await repository.wordings.put(
      await sampleWording({
        id: "nouveau",
        text: "💥 KO de Karim Fictif, encore !",
        fighterIds: [KARIM.id],
      }),
    );
    await vi.waitFor(() => expect(connected.retriever.size).toBe(17));

    await repository.wordings.delete("ko-karim");
    await vi.waitFor(() => expect(connected.retriever.size).toBe(16));
    const results = await findReferences(repository, connected.retriever, koBrief, {
      now: fixedNow(),
    });
    expect(results.map((r) => r.wording.id)).not.toContain("ko-karim");
    expect(results[0]?.wording.id).toBe("nouveau");
  });
});

describe("findReferences", () => {
  it("résout les combattants de la base et ignore les démos du seed", async () => {
    const results = await findReferences(repository, connected.retriever, koBrief, {
      now: fixedNow(),
    });
    expect(results[0]?.wording.id).toBe("ko-karim");
    expect(results.some((r) => r.wording.isDemo)).toBe(false);
    expect(results.every((r) => r.wording.mode === "live")).toBe(true);
  });

  it("utilise les poids des réglages et les générations récentes", async () => {
    const settings = await repository.getSettings();
    await repository.saveSettings({
      ...settings,
      retrievalWeights: { ...settings.retrievalWeights, sameCategory: 0, fighterOverlap: 0 },
    });
    await repository.generations.put({
      id: "g-recent",
      createdAt: NOW,
      updatedAt: NOW,
      brief: koBrief,
      engine: "native",
      referenceIds: ["ko-karim"],
      variants: [
        {
          id: "v",
          kind: "signature",
          selected: true,
          revisions: [{ id: "r", text: "KO", createdAt: NOW, origin: "native", factWarnings: [] }],
        },
      ],
      status: "draft",
    });
    const results = await findReferences(repository, connected.retriever, koBrief, {
      now: fixedNow(),
    });
    const karim = results.find((r) => r.wording.id === "ko-karim");
    expect(karim?.breakdown.sameCategory).toBe(0);
    expect(karim?.breakdown.usedRecently).toBeCloseTo(-0.15);
  });

  it("prend l'événement de la Session Live active", async () => {
    await repository.liveSessions.put({
      id: "session",
      eventName: "HEXAGONE MMA",
      eventNumber: 12,
      startedAt: NOW,
      active: true,
    });
    await repository.wordings.put(
      await sampleWording({
        id: "event-post",
        text: "🏟️ HEXAGONE MMA 12 : la salle est pleine.",
        categoryId: "live_crowd",
      }),
    );
    await vi.waitFor(() => expect(connected.retriever.size).toBe(17));
    const results = await findReferences(
      repository,
      connected.retriever,
      { ...koBrief, categoryId: "live_crowd", fields: { highlight: "ambiance" } },
      { now: fixedNow() },
    );
    expect(results.find((r) => r.wording.id === "event-post")?.breakdown.sameEvent).toBeCloseTo(
      0.1,
    );
  });
});
