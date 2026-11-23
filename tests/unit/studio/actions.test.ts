import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import { runSeed } from "@/lib/database/seed";
import { loadHookBank } from "@/lib/generation/native/hooks";
import { declineVariant, generateForBrief } from "@/lib/generation/orchestrator";
import { LocalBm25Retriever } from "@/lib/retrieval/retriever";
import { keepHook, publish, saveEdit, saveToLibrary, validate } from "@/lib/studio/actions";
import type { Brief, Generation } from "@/types/domain";
import { createTestRepository, disposeRepository, fixedNow } from "../../fixtures/entities";
import { RETRIEVAL_FIGHTERS, buildRetrievalCorpus } from "../../fixtures/retrieval-corpus";

let repository: DexieRepository;
let retriever: LocalBm25Retriever;
let generation: Generation;

const brief: Brief = {
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
  await repository.wordings.bulkPut(await buildRetrievalCorpus());
  retriever = new LocalBm25Retriever();
  retriever.load(await repository.wordings.list());
  generation = (await generateForBrief(repository, retriever, brief, { now: fixedNow() }))
    .generation;
});

afterEach(async () => {
  await disposeRepository(repository);
});

describe("actions du Studio sur la base", () => {
  it("édition : une révision cm_edit complétée tant que le CM reste dans le champ", async () => {
    const variant = generation.variants[0]!;
    const first = await saveEdit(repository, generation.id, variant.id, {
      text: "Brouillon A",
      factWarnings: [],
      now: fixedNow(),
    });
    const second = await saveEdit(repository, generation.id, variant.id, {
      text: "Brouillon AB",
      factWarnings: [],
      now: fixedNow(),
      mergeInto: first,
    });
    expect(second).toBe(first);
    const stored = await repository.generations.get(generation.id);
    expect(stored!.status).toBe("editing");
    expect(stored!.variants[0]!.revisions.map((r) => [r.origin, r.text])).toEqual([
      ["native", variant.revisions[0]!.text],
      ["cm_edit", "Brouillon AB"],
    ]);
  });

  it("« Garder l'accroche » : la première ligne rejoint la banque, généralisée", async () => {
    const saved = await keepHook(repository, generation, "🔥 KARIM FICTIF frappe fort\n\nSuite");
    expect(saved.pattern).toBe("{E} {WINNER_UPPER} frappe fort");
    expect(await loadHookBank(repository)).toHaveLength(1);
  });

  it("bibliothèque : wording validé, source studio, combattants reliés", async () => {
    const wording = await saveToLibrary(repository, generation, {
      text: "💥 KO de Karim Fictif !",
      date: "2026-11-21",
    });
    expect(wording).toMatchObject({
      status: "validated",
      source: "studio",
      mode: "live",
      categoryId: "live_ko",
      isDemo: false,
      date: "2026-11-21",
    });
    expect(wording.fighterIds.length).toBeGreaterThan(0);
    expect((await repository.generations.get(generation.id))!.savedToLibraryId).toBe(wording.id);
  });

  it("valider puis publier : texte final, date et lien", async () => {
    const variant = generation.variants[1]!;
    await validate(repository, generation.id, variant.id);
    const published = await publish(repository, generation.id, variant.id, {
      publishedAt: "2026-11-22",
      url: "https://instagram.com/p/abc",
    });
    expect(published).toMatchObject({
      status: "published",
      finalText: variant.revisions.at(-1)!.text,
      publishedAt: "2026-11-22",
      publishedUrl: "https://instagram.com/p/abc",
    });
  });

  it("déclinaison native : une version par autre plateforme, enregistrée", async () => {
    const variant = generation.variants[0]!;
    const outcome = await declineVariant(repository, retriever, generation.id, variant.id, {
      now: fixedNow(),
    });
    expect(Object.keys(outcome.versions).sort()).toEqual(["facebook", "tiktok", "x"]);
    expect(outcome.notice).toBeUndefined();
    for (const result of Object.values(outcome.versions)) expect(result!.factWarnings).toEqual([]);
    const stored = await repository.generations.get(generation.id);
    expect(stored!.declinations?.x).toBe(outcome.versions.x!.text);
  });
});
