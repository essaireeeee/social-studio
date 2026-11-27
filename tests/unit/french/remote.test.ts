import { afterEach, describe, expect, it, vi } from "vitest";
import { GET, POST } from "@/app/api/french/check/route";
import { buildCheckContext, isRuleEnabled, ruleToggles } from "@/lib/french/context";
import { autoWords, buildDictionary, MMA_LEXICON, wordsFromCsv } from "@/lib/french/dictionary";
import { checkLocal } from "@/lib/french/engine";
import { fromLanguageTool, longestChangedRun, placeAiErrors } from "@/lib/french/remote";
import { SettingsSchema, type Fighter, type HexEvent } from "@/types/domain";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

const post = (body: unknown) =>
  POST(
    new Request("http://localhost/api/french/check", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

describe("relecture IA : garde-fous", () => {
  it("rejette une correction qui change plus de 3 mots consécutifs", () => {
    expect(longestChangedRun("il à gagné", "il a gagné")).toBe(1);
    expect(
      longestChangedRun("Il a gagné par KO", "Il a remporté une victoire éclatante par KO"),
    ).toBe(4);
    const issues = placeAiErrors("Il à gagné. Le combat était dingue.", {
      errors: [
        { excerpt: "Il à gagné", correction: "Il a gagné", rule: "a / à" },
        {
          excerpt: "Le combat était dingue",
          correction: "Une soirée inoubliable pour tous les fans",
          rule: "style",
        },
        { excerpt: "absent du texte", correction: "x", rule: "?" },
      ],
    });
    expect(issues.map((i) => [i.excerpt, i.replacement, i.layer, i.confidence])).toEqual([
      ["Il à gagné", "Il a gagné", "ai", "medium"],
    ]);
  });

  it("alertes LanguageTool : positions vérifiées, toujours « À vérifier »", () => {
    const text = "Il à gagné.";
    const issues = fromLanguageTool(text, [
      {
        message: "Confusion",
        offset: 3,
        length: 1,
        replacements: [{ value: "a" }],
        rule: { id: "A_A", issueType: "grammar" },
      },
      { message: "Hors texte", offset: 50, length: 3, rule: { id: "X" } },
    ]);
    expect(issues).toHaveLength(1);
    expect(issues[0]).toMatchObject({
      excerpt: "à",
      replacement: "a",
      severity: "error",
      confidence: "medium",
      layer: "languagetool",
    });
  });
});

describe("route /api/french/check : jamais bloquante", () => {
  it("sans LANGUAGETOOL_URL : couche désactivée, réponse 200", async () => {
    vi.stubEnv("LANGUAGETOOL_URL", "");
    const response = await post({ text: "Il à gagné.", layers: ["languagetool", "ai"] });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      languagetool: { status: "disabled", issues: [] },
      ai: { status: "disabled", issues: [] },
    });
    expect(
      await (await GET(new Request("http://localhost/api/french/check"))).json(),
    ).toMatchObject({
      languagetool: { configured: false },
    });
  });

  it("LanguageTool injoignable : « indisponible », réponse 200", async () => {
    vi.stubEnv("LANGUAGETOOL_URL", "http://localhost:8010");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Promise.reject(new TypeError("fetch failed"))),
    );
    const response = await post({ text: "Il à gagné.", layers: ["languagetool"] });
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({
      languagetool: { status: "unavailable", issues: [] },
    });
  });

  it("LanguageTool répond : alertes relayées, appel /v2/check en français", async () => {
    vi.stubEnv("LANGUAGETOOL_URL", "http://localhost:8010/");
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) =>
      Response.json({
        matches: [
          {
            message: "Faute",
            offset: 3,
            length: 1,
            replacements: [{ value: "a" }],
            rule: { id: "R", issueType: "grammar" },
          },
        ],
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const body = await (await post({ text: "Il à gagné.", layers: ["languagetool"] })).json();
    expect(body.languagetool.status).toBe("ok");
    expect(body.languagetool.issues[0]).toMatchObject({ excerpt: "à", ruleId: "lt:R" });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("http://localhost:8010/v2/check");
    expect(String(init?.body)).toContain("language=fr");
  });

  it("requête invalide : 400 lisible", async () => {
    const response = await post({ text: "", layers: [] });
    expect(response.status).toBe(400);
  });
});

describe("dictionnaire maison", () => {
  const fighters = [
    {
      id: "f1",
      firstName: "Karim",
      lastName: "Fictif",
      nickname: "Le Marteau",
      fightHistory: [],
      updatedAt: "2026-11-20",
    },
  ] as Fighter[];
  const events = [
    {
      id: "e1",
      name: "HEXAGONE MMA",
      number: 14,
      city: "Besançon",
      venue: "Micropolis",
      links: [],
      broadcasters: [{ name: "RMC Sport" }],
      confirmedSchedule: false,
      fightCard: [],
      milestones: [],
      updatedAt: "2026-11-20",
    },
  ] as HexEvent[];

  it("noms des fiches, lexique MMA et ajouts du CM", () => {
    const words = autoWords({ fighters, events }).map((w) => `${w.kind}:${w.word}`);
    expect(words).toEqual(
      expect.arrayContaining([
        "fighter:Karim Fictif",
        "fighter:Le Marteau",
        "venue:Micropolis",
        "city:Besançon",
        "broadcaster:RMC Sport",
      ]),
    );
    const dictionary = buildDictionary({
      fighters,
      events,
      entries: [{ id: "d1", word: "Sambo", kind: "custom", origin: "cm", createdAt: "2026-11-20" }],
    });
    expect(dictionary.has("karim fictif")).toBe(true);
    expect(dictionary.has("sambo")).toBe(true);
    expect(MMA_LEXICON.every((w) => dictionary.has(w.toLowerCase()))).toBe(true);
  });

  it("import CSV : un mot par ligne, en-tête et doublons ignorés", () => {
    expect(wordsFromCsv([["mot"], ["Kimura"], ["kimura"], [""], ["Sambo", "x"]])).toEqual([
      "Kimura",
      "Sambo",
    ]);
  });

  it("contexte : règles désactivées, formules d'IA, diffuseurs", () => {
    const settings = SettingsSchema.parse({});
    const ctxStates = [
      {
        id: "homo-a-sujet",
        family: "homophones" as const,
        level: 1 as const,
        enabled: false,
        updatedAt: "2026-11-20",
      },
    ];
    const ctx = buildCheckContext({
      settings,
      fighters,
      events,
      sessions: [],
      entries: [],
      ruleStates: [
        {
          id: "homo-a-sujet",
          family: "homophones",
          level: 1,
          enabled: false,
          updatedAt: "2026-11-20",
        },
        { id: "nb-lettres", family: "nombres", level: 1, enabled: true, updatedAt: "2026-11-20" },
      ],
      editorialRules: [],
    });
    expect(ctx.disabledRules?.has("homo-a-sujet")).toBe(true);
    expect(ctx.broadcasters).toEqual(["RMC Sport"]);
    expect(checkLocal("Il à gagné.", ctx)).toEqual([]);
    expect(isRuleEnabled("homo-a-sujet", [])).toBe(true);
    expect(isRuleEnabled("homo-a-sujet", ctxStates)).toBe(false);
    expect(ruleToggles([]).disabledRules.size).toBe(0);
  });
});
