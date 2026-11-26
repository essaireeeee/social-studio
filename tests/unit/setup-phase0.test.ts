import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readTokens } from "@/lib/design/contrast";
import { cn } from "@/lib/utils";

describe("cn()", () => {
  it("fusionne les classes et résout les conflits Tailwind", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("bg-subtle", false && "hidden", "bg-accent")).toBe("bg-accent");
  });

  it("ne confond pas la taille text-13 avec une couleur", () => {
    expect(cn("text-13", "text-muted-foreground")).toBe("text-13 text-muted-foreground");
    expect(cn("text-13", "text-sm")).toBe("text-sm");
  });

  it("connaît l'échelle typographique iOS (taille, pas couleur)", () => {
    expect(cn("text-body", "text-label-2")).toBe("text-body text-label-2");
    expect(cn("text-body", "text-headline")).toBe("text-headline");
    expect(cn("text-13", "text-footnote")).toBe("text-footnote");
  });
});

describe("tokens V2 jour / nuit (section 5.2 de PROMPT_V2.md)", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8");
  const jour = readTokens(css, ':root[data-theme="light"]');
  const nuit = readTokens(css, ':root[data-theme="dark"]');

  // Valeurs du tableau 5.2, reprises telles quelles.
  it.each([
    ["bg", "#f2f2f7", "#000000"],
    ["bg-grouped", "#f2f2f7", "#000000"],
    ["surface", "#ffffff", "#1c1c1e"],
    ["surface-2", "#f2f2f7", "#2c2c2e"],
    ["surface-3", "#e5e5ea", "#3a3a3c"],
    ["label", "#000000", "#ffffff"],
    ["label-3", "rgba(60, 60, 67, 0.3)", "rgba(235, 235, 245, 0.3)"],
    ["separator", "rgba(60, 60, 67, 0.29)", "rgba(84, 84, 88, 0.6)"],
    ["fill", "rgba(120, 120, 128, 0.12)", "rgba(120, 120, 128, 0.24)"],
    ["bar-material", "rgba(249, 249, 249, 0.8)", "rgba(22, 22, 24, 0.8)"],
    ["live", "#e11d48", "#f43f5e"],
    ["live-text", "#be123c", "#fb7185"],
    ["daily", "#d97706", "#f59e0b"],
    ["daily-text", "#a84d07", "#fbbf24"],
    ["success", "#34c759", "#30d158"],
    ["warning", "#ff9500", "#ff9f0a"],
    ["danger", "#ff3b30", "#ff453a"],
  ])("--%s : %s (jour), %s (nuit)", (token, light, dark) => {
    expect(jour[token]).toBe(light);
    expect(nuit[token]).toBe(dark);
  });

  // Écarts au tableau 5.2, imposés par le test de contraste AA (PROGRESS.md, V2-1).
  it.each([
    ["label-2", "rgba(60, 60, 67, 0.78)", "rgba(235, 235, 245, 0.6)"],
    ["success-text", "#1c6f30", "#30d158"],
    ["warning-text", "#b83000", "#ff9f0a"],
    ["danger-text", "#c70014", "#ff6961"],
  ])("--%s ajusté pour l'AA : %s (jour), %s (nuit)", (token, light, dark) => {
    expect(jour[token]).toBe(light);
    expect(nuit[token]).toBe(dark);
  });

  it("rayons iOS : 10 champs et boutons, 12 cellules, 16 cartes, 20 sheets", () => {
    expect(css).toContain("--radius-md: 10px;");
    expect(css).toContain("--radius-lg: 12px;");
    expect(css).toContain("--radius-xl: 16px;");
    expect(css).toContain("--radius-2xl: 20px;");
  });

  it("l'accent suit data-mode, indépendamment du thème", () => {
    expect(css).toMatch(/:root {\s*[^}]*--accent: var\(--live\)/);
    expect(css).toMatch(/:root\[data-mode="daily"\] {[^}]*--accent: var\(--daily\)/);
    expect(css).toMatch(/:root\[data-mode="daily"\] {[^}]*--accent-text: var\(--daily-text\)/);
  });
});
