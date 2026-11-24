import { describe, expect, it } from "vitest";
import { getCategory } from "@/lib/categories/registry";
import { styleParameters } from "@/lib/editorial/profile-service";
import { DEFAULT_EDITORIAL_RULES } from "@/lib/editorial/rules";
import { jaccard, wordSet } from "@/lib/editorial/text-utils";
import { buildBriefContext } from "@/lib/generation/native/context";
import { generateNative } from "@/lib/generation/native/engine";
import type { Brief } from "@/types/domain";

/** Anti-répétition (section 10) : les accroches récentes du mode sont évitées. */
function hooksFor(brief: Brief, recentHooks: string[]) {
  const category = getCategory(brief.categoryId)!;
  const context = buildBriefContext(brief, category, { fighters: [], hashtags: [] });
  return generateNative({
    brief,
    category,
    context,
    style: { params: styleParameters(undefined, brief.mode) },
    references: [],
    recentHooks,
    rules: DEFAULT_EDITORIAL_RULES,
    frenchSpacing: true,
    regenerationCount: 0,
  }).variants.map((v) => v.hook);
}

const similarity = (hook: string, recent: readonly string[]) =>
  Math.max(0, ...recent.map((r) => jaccard(wordSet(hook), wordSet(r))));

describe("anti-répétition des accroches", () => {
  const briefs: Brief[] = [
    {
      mode: "live",
      categoryId: "live_ko",
      platform: "instagram",
      fields: { winner: "Karim Fictif", loser: "Tom Essai", method: "KO" },
      hashtagIds: [],
    },
    {
      mode: "live",
      categoryId: "live_sub",
      platform: "instagram",
      fields: { winner: "Ana Exemple", loser: "Zoé Test" },
      hashtagIds: [],
    },
    {
      mode: "daily",
      categoryId: "daily_ticketing",
      platform: "instagram",
      fields: { event: "HEXAGONE MMA 13" },
      hashtagIds: [],
    },
  ];

  it.each(briefs.map((b) => [b.categoryId, b] as const))(
    "%s : les accroches déjà publiées ne reviennent pas à l'identique",
    (_, brief) => {
      const first = hooksFor(brief, []);
      const second = hooksFor(brief, first);
      const repeated = second.filter((hook) => first.includes(hook));
      expect(repeated).toEqual([]);
      const before = Math.max(...first.map((h) => similarity(h, first)));
      const after = Math.max(...second.map((h) => similarity(h, first)));
      expect(after).toBeLessThan(before);
    },
  );
});
