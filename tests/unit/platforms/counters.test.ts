import { describe, expect, it } from "vitest";
import {
  checkPlatform,
  countForPlatform,
  countGraphemes,
  countHashtags,
  xWeightedLength,
} from "@/lib/platforms/counters";
import { PLATFORMS, PLATFORM_RULES } from "@/lib/platforms/rules";

describe("compteurs", () => {
  it("compte les graphèmes : un emoji composé vaut un caractère", () => {
    expect(countGraphemes("👨‍👩‍👧")).toBe(1);
    expect(countGraphemes("KO 💥 é")).toBe(6);
    expect("👨‍👩‍👧".length).toBeGreaterThan(1);
  });

  it("utilise le comptage pondéré officiel pour X", () => {
    expect(xWeightedLength("KO")).toBe(2);
    expect(xWeightedLength("💥")).toBe(2);
    expect(xWeightedLength("https://exemple.fr/une/adresse/tres/longue/pour/tester")).toBe(23);
    expect(countForPlatform("💥", "x")).toBe(2);
    expect(countForPlatform("💥", "instagram")).toBe(1);
  });

  it("compte les hashtags", () => {
    expect(countHashtags("#A texte #B #c")).toBe(3);
  });

  it("vérifie les limites de chaque plateforme", () => {
    expect(PLATFORMS).toEqual(["instagram", "facebook", "x", "tiktok"]);
    expect(PLATFORM_RULES.x).toMatchObject({ maxLength: 280, warnAt: 260 });
    expect(checkPlatform("a".repeat(281), "x").overLimit).toBe(true);
    expect(checkPlatform("a".repeat(280), "x").overLimit).toBe(false);
    expect(checkPlatform("a".repeat(2201), "instagram").overLimit).toBe(true);
  });
});
