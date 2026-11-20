import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
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
});

describe("tokens OCTOGON DARK (section 4.1)", () => {
  const css = readFileSync(join(process.cwd(), "app/globals.css"), "utf8").toLowerCase();

  it.each([
    ["--bg", "#0a0b0e"],
    ["--bg-elevated", "#101319"],
    ["--card", "#13161c"],
    ["--border", "#222630"],
    ["--text", "#f3f4f6"],
    ["--text-muted", "#9ca3af"],
    ["--live", "#e11d48"],
    ["--daily", "#d97706"],
    ["--success", "#10b981"],
    ["--warning", "#f59e0b"],
    ["--danger", "#ef4444"],
    ["--radius-sm", "6px"],
    ["--radius-md", "8px"],
    ["--radius-lg", "12px"],
  ])("%s vaut %s", (token, value) => {
    expect(css).toContain(`${token}: ${value};`);
  });

  it("bascule l'accent selon html[data-mode]", () => {
    expect(css).toMatch(/html\[data-mode="live"\]\s*{[^}]*--accent: var\(--live\)/);
    expect(css).toMatch(/html\[data-mode="daily"\]\s*{[^}]*--accent: var\(--daily\)/);
  });
});
