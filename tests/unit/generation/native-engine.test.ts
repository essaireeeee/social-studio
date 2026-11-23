import { describe, expect, it } from "vitest";
import { CATEGORIES, getCategory } from "@/lib/categories/registry";
import { lintText } from "@/lib/editorial/linter";
import { styleParameters } from "@/lib/editorial/profile-service";
import { DEFAULT_EDITORIAL_RULES } from "@/lib/editorial/rules";
import { jaccard, listEmojis, normalizeText, wordSet } from "@/lib/editorial/text-utils";
import { applyElision } from "@/lib/generation/native/composer";
import { buildBriefContext } from "@/lib/generation/native/context";
import { generateNative, type NativeEngineInput } from "@/lib/generation/native/engine";
import { generalizeHook } from "@/lib/generation/native/hooks";
import {
  ALL_TEMPLATES,
  TEMPLATE_VOCABULARY,
  templatesFor,
} from "@/lib/generation/native/templates";
import type { Brief, VariantKind } from "@/types/domain";
import { NOW } from "../../fixtures/entities";
import { POOL_FIGHTERS, randomBriefs, type RandomBrief } from "../../fixtures/random-briefs";

const KINDS: VariantKind[] = ["punchy", "signature", "storytelling"];

function run(sample: RandomBrief, patch: Partial<NativeEngineInput> = {}) {
  const category = getCategory(sample.brief.categoryId)!;
  const context = buildBriefContext(sample.brief, category, {
    fighters: POOL_FIGHTERS,
    liveSession: sample.liveSession,
    hashtags: sample.hashtags,
  });
  const result = generateNative({
    brief: sample.brief,
    category,
    context,
    style: { params: styleParameters(undefined, sample.brief.mode) },
    references: [],
    recentHooks: [],
    rules: DEFAULT_EDITORIAL_RULES,
    frenchSpacing: true,
    regenerationCount: 0,
    ...patch,
  });
  return { result, context };
}

const brief = (
  categoryId: string,
  fields: Brief["fields"],
  mode: Brief["mode"] = "live",
): RandomBrief => ({
  brief: { mode, categoryId, platform: "instagram", fields, hashtagIds: [] },
  hashtags: ["#HexagoneMMA"],
});

describe("catalogue des modèles (section 10.3)", () => {
  it("au moins 3 modèles par variante pour chacune des 38 catégories", () => {
    for (const category of CATEGORIES) {
      for (const kind of KINDS)
        expect(
          templatesFor(category.id, kind).length,
          `${category.id} ${kind}`,
        ).toBeGreaterThanOrEqual(3);
    }
    expect(ALL_TEMPLATES.length).toBe(342);
  });

  it("des empreintes de structure différentes entre les trois variantes", () => {
    for (const category of CATEGORIES) {
      const byKind = KINDS.map(
        (kind) => new Set(templatesFor(category.id, kind).map((t) => t.structure)),
      );
      for (const [i, a] of byKind.entries()) {
        for (const b of byKind.slice(i + 1))
          expect(
            [...a].filter((s) => b.has(s)),
            category.id,
          ).toEqual([]);
      }
    }
  });

  it("partage entre catégories sous 30 %, texte fixe sans nombre ni date", () => {
    const shared = ALL_TEMPLATES.filter((t) => t.categoryIds.length > 1).length;
    expect(shared / ALL_TEMPLATES.length).toBeLessThanOrEqual(0.3);
    const forbidden = [...TEMPLATE_VOCABULARY].filter(
      (w) =>
        /\d/.test(w) ||
        /^(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|janvier|fevrier|mars|avril|mai|juin|juillet|aout|septembre|octobre|novembre|decembre)$/.test(
          w,
        ),
    );
    expect(forbidden).toEqual([]);
  });
});

describe("propriété : aucune invention sur 200 briefs aléatoires", () => {
  const samples = randomBriefs(200);

  it("aucun nombre, horaire, date ou nom propre absent du brief", () => {
    const failures: string[] = [];
    for (const sample of samples) {
      const { result, context } = run(sample);
      const facts = normalizeText([...context.facts, ...sample.hashtags].join(" | "));
      for (const variant of result.variants) {
        if (variant.factWarnings.length > 0) {
          failures.push(
            `${sample.brief.categoryId}/${variant.kind}: ${JSON.stringify(variant.factWarnings)}\n${variant.text}`,
          );
        }
        // Contrôle indépendant : chaque nombre du texte figure dans les faits du brief.
        for (const number of normalizeText(variant.text.replace(/#\S+/g, "")).match(/\d+/g) ?? []) {
          if (!new RegExp(`(^|\\D)${number}(\\D|$)`).test(facts))
            failures.push(`${sample.brief.categoryId}/${variant.kind}: nombre ${number}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("trois structures différentes et des accroches non similaires", () => {
    const failures: string[] = [];
    for (const sample of samples) {
      const { result } = run(sample);
      const structures = result.variants.map((v) => v.structure);
      if (new Set(structures).size !== 3)
        failures.push(`${sample.brief.categoryId} structures ${structures}`);
      const hooks = result.variants.map((v) => wordSet(v.hook));
      for (let i = 0; i < 3; i += 1) {
        for (let j = i + 1; j < 3; j += 1) {
          const similarity = jaccard(hooks[i]!, hooks[j]!);
          if (similarity >= 0.5)
            failures.push(
              `${sample.brief.categoryId} accroches ${similarity.toFixed(2)} : ${result.variants[i]!.hook} / ${result.variants[j]!.hook}`,
            );
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it("texte déjà conforme au linter, sans question finale sur les catégories factuelles", () => {
    for (const sample of samples) {
      const { result } = run(sample);
      for (const variant of result.variants) {
        expect(
          lintText(variant.text, {
            rules: DEFAULT_EDITORIAL_RULES,
            categoryId: sample.brief.categoryId,
            frenchSpacing: true,
          }).fixes,
        ).toEqual([]);
        expect(variant.warnings.filter((w) => w.kind === "final_question")).toEqual([]);
      }
    }
  });
});

describe("comportement", () => {
  const ko = brief("live_ko", {
    winner: "Karim Fictif",
    loser: "Tom Essai",
    method: "KO",
    round: "R1",
    time: "3:12",
  });

  it("déterministe à graine égale, différent après régénération", () => {
    expect(run(ko).result.variants.map((v) => v.text)).toEqual(
      run(ko).result.variants.map((v) => v.text),
    );
    const other = run(ko, { regenerationCount: 3 }).result.variants.map((v) => v.text);
    expect(other).not.toEqual(run(ko).result.variants.map((v) => v.text));
  });

  it("variantes dans l'ordre des réglages, le vainqueur toujours cité", () => {
    const { result } = run(ko);
    expect(result.variants.map((v) => v.kind)).toEqual(["signature", "punchy", "storytelling"]);
    for (const v of result.variants) expect(v.text).toContain("Karim Fictif");
  });

  it("punchy : 1 à 2 emojis, aucun pour un communiqué", () => {
    const punchy = run(ko).result.variants.find((v) => v.kind === "punchy")!;
    expect(listEmojis(punchy.text).length).toBeGreaterThanOrEqual(1);
    expect(listEmojis(punchy.text).length).toBeLessThanOrEqual(2);
    const statement = run(
      brief(
        "comm_statement",
        { subject: "Calendrier", body: "La ligue précise son calendrier." },
        "daily",
      ),
    );
    for (const v of statement.result.variants) expect(listEmojis(v.text)).toEqual([]);
  });

  it("hashtags : uniquement ceux cochés, aucun sinon", () => {
    const none = run({ ...ko, hashtags: [] }).result.variants;
    for (const v of none) expect(v.text).not.toContain("#");
    for (const v of run(ko).result.variants)
      expect(v.text.match(/#\w+/g)).toEqual(["#HexagoneMMA"]);
  });

  it("règle Samba Sima : qualifié en contexte positif, jamais en défaite", () => {
    const win = run(brief("live_ko", { winner: "Samba Sima", loser: "Tom Essai", method: "KO" }));
    for (const v of win.result.variants) {
      expect(v.text).toMatch(/crack|phénomène/);
      expect(v.warnings.filter((w) => w.kind === "samba_sima")).toEqual([]);
    }
    const defeat = run(brief("live_defeat", { fighter: "Samba Sima", opponent: "Tom Essai" }));
    for (const v of defeat.result.variants) expect(v.text).not.toMatch(/crack|phénomène/);
  });

  it("question finale : DAILY seulement, une génération sur trois au plus, en storytelling", () => {
    const announce = brief(
      "daily_fight_announce",
      { fighterA: "Karim Fictif", fighterB: "Tom Essai", event: "HEXAGONE MMA 13" },
      "daily",
    );
    let withQuestion = 0;
    for (let count = 0; count < 30; count += 1) {
      const { result } = run(announce, { regenerationCount: count });
      for (const v of result.variants) {
        const last =
          v.text
            .split("\n")
            .filter((l) => l.trim() && !l.startsWith("#"))
            .at(-1) ?? "";
        if (last.endsWith("?")) {
          expect(v.kind).toBe("storytelling");
          withQuestion += 1;
        }
      }
    }
    expect(withQuestion).toBeGreaterThan(0);
    expect(withQuestion).toBeLessThanOrEqual(10);
  });

  it("ne recopie jamais une référence", () => {
    const first = run(ko).result.variants;
    const references = first.map((v, i) => ({ id: `ref-${i}`, text: v.text }));
    const second = run(ko, { references }).result.variants;
    for (const v of second) {
      for (const ref of references) expect(v.text).not.toBe(ref.text);
      expect(v.copy.copied).toBe(false);
    }
  });

  it("utilise les accroches gardées par le CM", () => {
    const pattern = generalizeHook("🔥 Karim Fictif signe la fin du combat", {
      winner: "Karim Fictif",
    });
    expect(pattern).toBe("{E} {winner} signe la fin du combat");
    const savedHooks = [
      { id: "h", mode: "live" as const, categoryId: "live_ko", text: "x", pattern, createdAt: NOW },
    ];
    const hooks = Array.from({ length: 20 }, (_, count) =>
      run(ko, { savedHooks, regenerationCount: count }).result.variants.map((v) => v.hook),
    ).flat();
    expect(hooks.some((h) => h.includes("signe la fin du combat"))).toBe(true);
  });

  it("élision devant une voyelle, jamais devant HEXAGONE", () => {
    expect(
      applyElision("Victoire de Ali, SOUMISSION DE ALI, ceinture de HEXAGONE MMA, de Tom"),
    ).toBe("Victoire d'Ali, SOUMISSION D'ALI, ceinture de HEXAGONE MMA, de Tom");
  });
});
