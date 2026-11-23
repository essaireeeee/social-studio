import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { AiVariantResult } from "@/lib/ai/service";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import { runSeed } from "@/lib/database/seed";
import type { AiTransport } from "@/lib/generation/ai-client";
import { RefineUnavailableError } from "@/lib/generation/native/refine";
import {
  fallbackNotice,
  generateBody,
  generateForBrief,
  refineAvailability,
  refineFallbackNotice,
  refineVariant,
} from "@/lib/generation/orchestrator";
import { loadGenerationContext } from "@/lib/generation/context-loader";
import { LocalBm25Retriever } from "@/lib/retrieval/retriever";
import type { Brief, Engine } from "@/types/domain";
import { createTestRepository, disposeRepository, fixedNow } from "../../fixtures/entities";
import { RETRIEVAL_FIGHTERS, buildRetrievalCorpus } from "../../fixtures/retrieval-corpus";

let repository: DexieRepository;
let retriever: LocalBm25Retriever;

const brief: Brief = {
  mode: "live",
  categoryId: "live_ko",
  platform: "instagram",
  fields: { winner: "Karim Fictif", loser: "Tom Essai", method: "KO", round: "R2" },
  hashtagIds: ["hashtags-official"],
};

const aiVariant = (kind: AiVariantResult["kind"], text: string): AiVariantResult => ({
  kind,
  text,
  hook: text.split("\n")[0]!,
  usedFacts: [],
  fixes: [],
  warnings: [],
  factWarnings: [],
  copy: { copied: false, longestRun: 0, shingleJaccard: 0 },
  adapted: false,
});

function transport(patch: Partial<AiTransport> = {}): AiTransport {
  return {
    generate: vi.fn(async () => ({
      fallback: true as const,
      reason: "non utilisé",
      code: "provider" as const,
    })),
    refine: vi.fn(async () => ({
      fallback: true as const,
      reason: "non utilisé",
      code: "provider" as const,
    })),
    decline: vi.fn(async () => ({
      fallback: true as const,
      reason: "non utilisé",
      code: "provider" as const,
    })),
    ...patch,
  };
}

async function useEngine(engine: Engine) {
  const settings = await repository.getSettings();
  await repository.saveSettings({ ...settings, aiProvider: engine });
}

beforeEach(async () => {
  repository = createTestRepository();
  await runSeed(repository, fixedNow());
  await repository.fighters.bulkPut(RETRIEVAL_FIGHTERS);
  await repository.wordings.bulkPut(await buildRetrievalCorpus());
  retriever = new LocalBm25Retriever();
  retriever.load(await repository.wordings.list());
});

afterEach(async () => {
  await disposeRepository(repository);
});

describe("génération : choix du moteur et bascule", () => {
  it("moteur natif : aucun appel IA", async () => {
    const t = transport();
    const outcome = await generateForBrief(repository, retriever, brief, { transport: t });
    expect(outcome.engine).toBe("native");
    expect(outcome.notice).toBeUndefined();
    expect(t.generate).not.toHaveBeenCalled();
  });

  it("IA indisponible : moteur natif et message exact", async () => {
    await useEngine("anthropic");
    const t = transport({
      generate: vi.fn(async () => ({
        fallback: true as const,
        reason: "clé refusée par le fournisseur (401)",
        code: "auth" as const,
      })),
    });
    const outcome = await generateForBrief(repository, retriever, brief, { transport: t });
    expect(outcome.engine).toBe("native");
    expect(outcome.notice).toBe(
      "Génération IA indisponible (clé refusée par le fournisseur (401)). Propositions produites par le moteur natif.",
    );
    expect(outcome.notice).toBe(fallbackNotice("clé refusée par le fournisseur (401)"));
    const stored = await repository.generations.get(outcome.generation.id);
    expect(stored).toMatchObject({
      engine: "native",
      fallbackReason: "clé refusée par le fournisseur (401)",
    });
  });

  it("IA disponible : variantes dans l'ordre des réglages, origine du fournisseur", async () => {
    await useEngine("anthropic");
    const t = transport({
      generate: vi.fn(async () => ({
        fallback: false as const,
        provider: "anthropic" as const,
        model: "claude-sonnet-5-5",
        durationMs: 10,
        variants: [
          aiVariant("storytelling", "⚡ Une fin nette."),
          aiVariant("punchy", "💥 KO !"),
          aiVariant("signature", "🔥 Karim Fictif s'impose."),
        ],
      })),
    });
    const outcome = await generateForBrief(repository, retriever, brief, { transport: t });
    expect(outcome.engine).toBe("anthropic");
    expect(
      outcome.generation.variants.map((v) => [v.kind, v.selected, v.revisions[0]!.origin]),
    ).toEqual([
      ["signature", true, "anthropic"],
      ["punchy", false, "anthropic"],
      ["storytelling", false, "anthropic"],
    ]);
  });

  it("corps envoyé : faits, références du même mode, aucune clé", async () => {
    const loaded = await loadGenerationContext(repository, retriever, brief, { now: fixedNow() });
    const body = generateBody(loaded, "anthropic");
    expect(body.facts).toContain("Karim Fictif");
    expect(body.references.length).toBeGreaterThan(0);
    expect(body.references.length).toBeLessThanOrEqual(10);
    expect(body.hashtags).toContain("#HexagoneMMA");
    expect(body.styleProfileSummary.source).toBe("defaults");
    expect(JSON.stringify(body)).not.toMatch(/api[-_]?key|sk-/i);
  });
});

describe("retouche : une nouvelle révision à chaque action", () => {
  async function draft() {
    const outcome = await generateForBrief(repository, retriever, brief, {
      transport: transport(),
    });
    return { generation: outcome.generation, variant: outcome.generation.variants[0]! };
  }

  it("natif : révision ajoutée, rien n'est écrasé", async () => {
    const { generation, variant } = await draft();
    const first = await refineVariant(repository, retriever, generation.id, variant.id, "new_hook");
    const second = await refineVariant(
      repository,
      retriever,
      generation.id,
      variant.id,
      "toggle_emojis",
    );
    const stored = await repository.generations.get(generation.id);
    const revisions = stored!.variants.find((v) => v.id === variant.id)!.revisions;
    expect(revisions.map((r) => [r.origin, r.action])).toEqual([
      ["native", undefined],
      ["native", "new_hook"],
      ["native", "toggle_emojis"],
    ]);
    expect(revisions[0]!.text).toBe(variant.revisions[0]!.text);
    expect(revisions[1]!.id).toBe(first.revision.id);
    expect(revisions[2]!.id).toBe(second.revision.id);
  });

  it("IA indisponible : retouche native et message ; consigne libre : refus", async () => {
    const { generation, variant } = await draft();
    await useEngine("openai");
    const t = transport({
      refine: vi.fn(async () => ({
        fallback: true as const,
        reason: "limite de requêtes atteinte (429)",
        code: "rate_limit" as const,
      })),
    });
    const outcome = await refineVariant(
      repository,
      retriever,
      generation.id,
      variant.id,
      "new_hook",
      {
        transport: t,
      },
    );
    expect(outcome.revision.origin).toBe("native");
    expect(outcome.notice).toBe(refineFallbackNotice("limite de requêtes atteinte (429)"));
    await expect(
      refineVariant(repository, retriever, generation.id, variant.id, "custom", {
        transport: t,
        instruction: "Mentionne la salle",
      }),
    ).rejects.toThrow(RefineUnavailableError);
  });

  it("IA disponible : révision d'origine fournisseur, consigne conservée", async () => {
    const { generation, variant } = await draft();
    await useEngine("anthropic");
    const t = transport({
      refine: vi.fn(async () => ({
        fallback: false as const,
        provider: "anthropic" as const,
        model: "claude-sonnet-5-5",
        durationMs: 5,
        result: aiVariant("signature", "🔥 Texte retouché."),
      })),
    });
    const outcome = await refineVariant(
      repository,
      retriever,
      generation.id,
      variant.id,
      "custom",
      {
        transport: t,
        instruction: "Plus sobre",
      },
    );
    expect(outcome.revision).toMatchObject({
      origin: "anthropic",
      action: "custom",
      instruction: "Plus sobre",
      text: "🔥 Texte retouché.",
    });
  });

  it("consigne libre désactivée en natif, avec l'infobulle", () => {
    expect(refineAvailability("native", "custom")).toBe(
      "Consigne libre disponible avec un moteur IA connecté",
    );
    expect(refineAvailability("anthropic", "custom")).toBeNull();
    expect(refineAvailability("native", "shorten")).toBeNull();
  });
});
