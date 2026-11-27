import { describe, expect, it } from "vitest";
import { getFrenchRule } from "@/lib/french/rules";
import {
  daySeed,
  MIN_ALERTS_FOR_STATS,
  ruleOfTheDay,
  trendLabel,
  weakPoints,
} from "@/lib/french/stats";
import { buildSeries, difference, recordAnswer, SERIES_LENGTH } from "@/lib/french/training";
import type { FrenchIssueRecord } from "@/types/v2";

const NOW = new Date("2026-11-27T12:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW.getTime() - n * 86_400_000).toISOString();
const record = (
  ruleId: string,
  ago: number,
  author: FrenchIssueRecord["author"] = "cm",
  correction?: string,
): FrenchIssueRecord => ({
  id: `${ruleId}-${ago}-${author}-${Math.round(Math.random() * 1e9)}`,
  ruleId,
  family: getFrenchRule(ruleId)?.family,
  layer: "local",
  severity: "error",
  confidence: "high",
  author,
  excerpt: "à",
  correction,
  resolution: "corrected",
  createdAt: daysAgo(ago),
});

describe("Mes points faibles", () => {
  it("aucune statistique sous 10 alertes du CM ; les sorties des moteurs ne comptent pas", () => {
    const engine = Array.from({ length: 30 }, (_, i) => record("homo-a-sujet", i, "native"));
    const own = Array.from({ length: MIN_ALERTS_FOR_STATS - 1 }, (_, i) =>
      record("homo-a-sujet", i),
    );
    expect(weakPoints([...engine, ...own], NOW)).toBeNull();
  });

  it("règles classées par fréquence, tendance sur 30 jours", () => {
    const records = [
      ...Array.from({ length: 6 }, (_, i) => record("homo-a-sujet", i)),
      ...Array.from({ length: 2 }, (_, i) => record("homo-a-sujet", 40 + i)),
      ...Array.from({ length: 3 }, (_, i) => record("conj-a-ete", 35 + i)),
    ];
    const points = weakPoints(records, NOW)!;
    expect(points.map((p) => [p.ruleId, p.count, p.last30, p.previous30])).toEqual([
      ["homo-a-sujet", 8, 6, 2],
      ["conj-a-ete", 3, 0, 3],
    ]);
    expect(trendLabel(points[0]!)).toBe("en hausse");
    expect(trendLabel(points[1]!)).toBe("en baisse");
  });
});

describe("règle du jour", () => {
  it("stable sur la journée, tirée des points faibles quand il y a des données", () => {
    expect(ruleOfTheDay([], NOW).id).toBe(
      ruleOfTheDay([], new Date("2026-11-27T22:00:00.000Z")).id,
    );
    expect(daySeed(NOW)).not.toBe(daySeed(new Date("2026-11-28T08:00:00.000Z")));
    const records = Array.from({ length: 12 }, (_, i) => record("conj-a-ete", i));
    expect(ruleOfTheDay(records, NOW).id).toBe("conj-a-ete");
    expect(ruleOfTheDay(records, NOW, (id) => id !== "conj-a-ete").id).not.toBe("conj-a-ete");
  });
});

describe("entraînement", () => {
  it("phrase à trou tirée d'un exemple", () => {
    expect(difference("Il à gagné par KO.", "Il a gagné par KO.")).toEqual({
      before: "Il ",
      wrong: "à",
      right: "a",
      after: " gagné par KO.",
    });
  });

  it("série de 10, erreurs passées du CM d'abord, deux options dont la bonne", () => {
    const mine = record("homo-a-sujet", 1, "cm", "a");
    const series = buildSeries([mine], 3, NOW);
    expect(series).toHaveLength(SERIES_LENGTH);
    expect(series[0]).toMatchObject({ ruleId: "homo-a-sujet", answer: "a", kind: "choice" });
    for (const exercise of series) {
      expect(exercise.options).toContain(exercise.answer);
      expect(new Set(exercise.options).size).toBe(2);
    }
    expect(buildSeries([], 3, NOW).map((e) => e.id)).toEqual(
      buildSeries([], 3, NOW).map((e) => e.id),
    );
  });

  it("progression par famille", () => {
    const [exercise] = buildSeries([], 1, NOW);
    const progress = recordAnswer(recordAnswer({}, exercise!, true), exercise!, false);
    expect(progress[exercise!.family]).toEqual({ answered: 2, correct: 1 });
  });
});

describe("dictionnaire : nouveaux mots", () => {
  it("écarte les mots vides, trop longs, déjà connus ou en double", async () => {
    const { newEntries, MAX_DICTIONARY_WORD } = await import("@/lib/french/dictionary");
    let n = 0;
    const { entries, skipped } = newEntries(
      [
        "  Hexagone  Arena ",
        "kimura",
        "Kimura",
        "",
        "x".repeat(MAX_DICTIONARY_WORD + 1),
        "Le Cube",
        "le cube",
      ],
      new Set(["kimura"]),
      "2026-11-27T10:00:00.000Z",
      () => `id-${(n += 1)}`,
    );
    expect(entries.map((e) => e.word)).toEqual(["Hexagone Arena", "Le Cube"]);
    expect(entries[0]).toMatchObject({ kind: "custom", origin: "cm", id: "id-1" });
    expect(skipped).toHaveLength(4);
  });
});
