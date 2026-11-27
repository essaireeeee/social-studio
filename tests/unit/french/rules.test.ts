/**
 * Référentiel de l'Atelier Français : chaque règle détecte ses exemples fautifs, les
 * corrige exactement, et laisse passer ses exemples corrects (critère V2-2).
 */
import { describe, expect, it } from "vitest";
import { applyFixes, checkLocal, FRENCH_RULES } from "@/lib/french/engine";
import type { FrenchRule } from "@/lib/french/types";

const only = (rule: FrenchRule) => ({
  onlyRules: new Set([rule.id]),
});
const ctxFor = (rule: FrenchRule) => ({
  prefs: rule.testPrefs,
  mode: rule.testMode,
});

describe.each(FRENCH_RULES.map((rule) => [rule.id, rule] as const))("%s", (_id, rule) => {
  it("au moins deux exemples fautifs et deux corrects, explication en deux phrases", () => {
    expect(rule.examples.length).toBeGreaterThanOrEqual(2);
    expect(
      rule.explanation.split(/[.!?](?:\s|$)/).filter((s) => s.trim()).length,
    ).toBeLessThanOrEqual(3);
  });

  it.each(rule.examples.map((e) => [e.wrong, e.right] as const))(
    "détecte et corrige : %s",
    (wrong, right) => {
      const issues = checkLocal(wrong, ctxFor(rule), only(rule));
      expect(issues.length, `aucune alerte sur « ${wrong} »`).toBeGreaterThan(0);
      if (rule.exactFix !== false) expect(applyFixes(wrong, issues)).toBe(right);
    },
  );

  it.each([...rule.examples.map((e) => e.right), ...(rule.alsoRight ?? [])].map((t) => [t]))(
    "ne signale pas : %s",
    (text) => {
      const issues = checkLocal(text, ctxFor(rule), only(rule));
      expect(issues.map((i) => i.excerpt)).toEqual([]);
    },
  );
});
