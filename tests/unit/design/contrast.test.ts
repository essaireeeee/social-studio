import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { ICON_COLORS } from "@/lib/design/icon-colors";
import {
  contrastPairs,
  contrastRatio,
  pairRatio,
  parseColor,
  readTokens,
} from "@/lib/design/contrast";

const css = readFileSync(path.join(process.cwd(), "app/globals.css"), "utf8");
const themes = {
  jour: readTokens(css, ':root[data-theme="light"]'),
  nuit: readTokens(css, ':root[data-theme="dark"]'),
};

describe("calcul du contraste", () => {
  it("valeurs de référence WCAG", () => {
    expect(contrastRatio(parseColor("#000"), parseColor("#fff"))).toBeCloseTo(21, 5);
    expect(contrastRatio(parseColor("#777777"), parseColor("#ffffff"))).toBeCloseTo(4.48, 2);
    expect(parseColor("rgba(60, 60, 67, 0.75)")).toEqual({ r: 60, g: 60, b: 67, a: 0.75 });
  });

  it("lit les deux thèmes dans globals.css", () => {
    expect(themes.jour.bg).toBe("#f2f2f7");
    expect(themes.nuit.bg).toBe("#000000");
  });
});

describe.each(Object.entries(themes))("thème %s", (_name, tokens) => {
  it.each(
    contrastPairs().map(
      (pair) =>
        [
          `--${pair.text} sur ${pair.layers.join(" / ")}${pair.tint ? " teinté" : ""}`,
          pair,
        ] as const,
    ),
  )("%s", (_label, pair) => {
    const ratio = pairRatio(tokens, pair);
    expect(ratio, `${pair.usage} : ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(pair.min);
  });
});

describe("carrés d'icône des cellules", () => {
  it.each(Object.entries(ICON_COLORS))("%s : icône blanche à 3:1 au moins", (_name, color) => {
    expect(contrastRatio(parseColor("#ffffff"), parseColor(color))).toBeGreaterThanOrEqual(3);
  });
});
