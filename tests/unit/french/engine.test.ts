import { describe, expect, it } from "vitest";
import {
  applyFixes,
  autoCorrect,
  checkLocal,
  fixAll,
  FRENCH_RULES,
  forCopy,
  ignoreKey,
  issueSummary,
  mergeIssues,
} from "@/lib/french/engine";
import type { FrenchIssue } from "@/lib/french/types";
import { FrenchRuleFamilySchema } from "@/types/v2";
import { CORRECT_MMA_SENTENCES } from "../../fixtures/french-corpus";

const errors = (text: string, ctx = {}) =>
  checkLocal(text, ctx).filter((i) => i.severity === "error");

describe("référentiel (critères V2-2)", () => {
  it("au moins 120 règles, dans les douze familles, identifiants uniques", () => {
    expect(FRENCH_RULES.length).toBeGreaterThanOrEqual(120);
    const families = new Set(FRENCH_RULES.map((r) => r.family));
    expect([...families].sort()).toEqual([...FrenchRuleFamilySchema.options].sort());
    expect(new Set(FRENCH_RULES.map((r) => r.id)).size).toBe(FRENCH_RULES.length);
  });

  it("chaque règle a au moins 2 exemples fautifs et 2 corrects", () => {
    for (const rule of FRENCH_RULES) {
      expect(rule.examples.length, rule.id).toBeGreaterThanOrEqual(2);
      const right = rule.examples.map((e) => e.right).concat(rule.alsoRight ?? []);
      expect(new Set(right).size, rule.id).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("corpus de 100 phrases MMA correctes", () => {
  it("contient 100 phrases distinctes", () => {
    expect(new Set(CORRECT_MMA_SENTENCES).size).toBe(100);
  });

  it("moins de 3 faux positifs de sévérité « error »", () => {
    const flagged = CORRECT_MMA_SENTENCES.flatMap((sentence) =>
      errors(sentence).map((i) => `${i.ruleId} : « ${i.excerpt} » dans « ${sentence} »`),
    );
    expect(flagged.length, flagged.join("\n")).toBeLessThan(3);
  });
});

describe("ce qui n'est jamais analysé", () => {
  it("hashtags, mentions, liens et emojis", () => {
    const text =
      "Quel combat 💥 #ilaété #KOs @sa_team_ou_pas https://exemple.fr/il-à-gagné?ou=là www.ce-soir-la.fr";
    expect(errors(text)).toEqual([]);
    expect(checkLocal("#HexagoneMMA #mma #ko").map((i) => i.ruleId)).toEqual([]);
  });

  it("les noms des fiches combattants (dictionnaire)", () => {
    const dictionary = new Set(["sa ces", "leurs", "on"]);
    expect(errors("Victoire de Sa Ces par KO.", { dictionary })).toEqual([]);
    // Sans dictionnaire, « Sa Ces » ressemble à une faute d'accord.
    expect(errors("Victoire de Sa Ces par KO.")).toEqual([]);
  });

  it("les citations d'une réaction de combattant", () => {
    const quote = "Karim : « Ils on tout donné, moi aussi ».";
    expect(errors(quote).length).toBeGreaterThan(0);
    expect(errors(quote, { categoryId: "live_reaction" })).toEqual([]);
  });
});

describe("moteur", () => {
  it("analyse un post en moins de 30 ms (hors ligne, couche 1)", () => {
    const post = [
      "💥 KO de Karim Fictif au premier round à HEXAGONE MMA 14 !",
      "",
      "Il a été exceptionnel du début à la fin, et le public de Paris s'est levé d'un bond.",
      "Prochain rendez-vous samedi 14 mars, en direct sur RMC Sport à partir de 21h.",
      "",
      "#HexagoneMMA #MMAFrance",
    ].join("\n");
    checkLocal(post);
    const runs = 20;
    const started = performance.now();
    for (let i = 0; i < runs; i += 1) checkLocal(post);
    expect((performance.now() - started) / runs).toBeLessThan(30);
  });

  it("Tout corriger : fautes sûres et typographie, les « À vérifier » restent", () => {
    const text = "Il à gagné! La victoire qu'il a obtenu restera.";
    const issues = checkLocal(text);
    const fixed = fixAll(text, issues);
    expect(fixed).toBe("Il a gagné ! La victoire qu'il a obtenu restera.");
    expect(issueSummary(checkLocal(fixed))).toMatchObject({ errors: 0, toCheck: 1 });
  });

  it("autoCorrect corrige jusqu'à stabilité", () => {
    expect(autoCorrect("il à gagné.")).toBe("Il a gagné.");
    expect(autoCorrect("Il à gagné. il revient samedi.")).toBe("Il a gagné. Il revient samedi.");
  });

  it("ignorer ici, désactiver une règle", () => {
    const text = "Il à gagné.";
    const [issue] = checkLocal(text);
    expect(issue).toBeDefined();
    expect(checkLocal(text, { ignored: new Set([ignoreKey(issue!)]) })).toEqual([]);
    expect(checkLocal(text, { disabledRules: new Set([issue!.ruleId]) })).toEqual([]);
  });

  it("fusion : une alerte distante qui chevauche une alerte locale est écartée", () => {
    const text = "Il à gagné hier.";
    const local = checkLocal(text);
    const remote: FrenchIssue[] = [
      { ...local[0]!, id: "lt:x", layer: "languagetool", ruleId: "lt:A", message: "LT" },
      {
        id: "lt:y",
        ruleId: "lt:B",
        layer: "languagetool",
        severity: "warning",
        confidence: "medium",
        start: 11,
        end: 15,
        excerpt: "hier",
        message: "Mot",
        autofix: false,
      },
      {
        id: "lt:z",
        ruleId: "lt:C",
        layer: "languagetool",
        severity: "error",
        confidence: "high",
        start: 11,
        end: 15,
        excerpt: "autre",
        message: "Décalé",
        autofix: false,
      },
    ];
    const merged = mergeIssues(text, local, remote);
    expect(merged.map((i) => i.ruleId)).toEqual([local[0]!.ruleId, "lt:B"]);
    expect(mergeIssues(text, local, remote, { dictionary: new Set(["hier"]) })).toHaveLength(1);
  });

  it("applique les corrections sans chevauchement", () => {
    const text = "Quel  combat!";
    expect(applyFixes(text, checkLocal(text))).toBe("Quel combat !");
  });

  it("copie compatible réseaux sociaux : espace fine remplacée par l'insécable", () => {
    expect(forCopy("KO !", true)).toBe("KO !");
    expect(forCopy("KO !", false)).toBe("KO !");
  });
});
