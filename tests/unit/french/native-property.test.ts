/**
 * Critère V2-2 : une faute produite par un modèle natif est un bug. Sur 200 briefs
 * aléatoires, aucune alerte de sévérité « error » et de confiance « high ».
 */
import { describe, expect, it } from "vitest";
import { getCategory } from "@/lib/categories/registry";
import { styleParameters } from "@/lib/editorial/profile-service";
import { DEFAULT_EDITORIAL_RULES } from "@/lib/editorial/rules";
import { checkLocal } from "@/lib/french/engine";
import { buildBriefContext } from "@/lib/generation/native/context";
import { generateNative } from "@/lib/generation/native/engine";
import { POOL_FIGHTERS, randomBriefs } from "../../fixtures/random-briefs";

/** Dictionnaire automatique : noms, prénoms et surnoms des fiches (section 6.2). */
const dictionary = new Set(
  POOL_FIGHTERS.flatMap((f) => [
    f.firstName,
    f.lastName,
    f.nickname,
    `${f.firstName} ${f.lastName}`,
  ])
    .filter((v): v is string => Boolean(v))
    .map((v) => v.toLowerCase()),
);

describe("propriété : le moteur natif ne produit aucune faute", () => {
  it("200 briefs aléatoires, zéro « error » de confiance « high »", () => {
    const failures: string[] = [];
    for (const sample of randomBriefs(200, 7)) {
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
      });
      for (const variant of result.variants) {
        const issues = checkLocal(variant.text, {
          dictionary,
          mode: sample.brief.mode,
          categoryId: sample.brief.categoryId,
        }).filter((i) => i.severity === "error" && i.confidence === "high");
        for (const issue of issues)
          failures.push(
            `${sample.brief.categoryId}/${variant.kind} ${issue.ruleId} « ${issue.excerpt} » → ${issue.replacement}\n${variant.text}`,
          );
      }
    }
    expect(failures.slice(0, 15).join("\n\n"), `${failures.length} fautes`).toBe("");
  });
});
