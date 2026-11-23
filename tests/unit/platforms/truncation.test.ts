import { describe, expect, it } from "vitest";
import { xSplit } from "@/lib/platforms/counters";
import {
  truncateCaption,
  truncateFacebook,
  truncateInstagram,
  truncateTikTok,
} from "@/lib/platforms/truncation";

describe("coupure Instagram (section 13.5)", () => {
  it("texte court : rien n'est coupé", () => {
    const t = truncateInstagram("💥 KO de Karim Fictif !", 125);
    expect(t).toMatchObject({ truncated: false, hidden: "", visibleCount: 22, hookCut: false });
  });

  it("s'arrête à la fin de la 2e ligne", () => {
    const text = "Ligne 1\nLigne 2\nLigne 3 et la suite";
    const t = truncateInstagram(text, 125);
    expect(t.visible).toBe("Ligne 1\nLigne 2");
    expect(t.hidden).toBe("Ligne 3 et la suite");
    expect(t.truncated).toBe(true);
  });

  it("une ligne vide compte comme une ligne", () => {
    const t = truncateInstagram("Accroche\n\nCorps du texte", 125);
    expect(t.visible).toBe("Accroche");
  });

  it("au seuil : recule jusqu'à l'espace précédent", () => {
    const text = "Karim Fictif termine le combat au premier round devant une salle debout";
    expect(truncateInstagram(text, 20).visible).toBe("Karim Fictif termine");
    const t = truncateInstagram(text, 18);
    expect(t.visible).toBe("Karim Fictif");
    expect(t.visibleCount).toBe(12);
    expect(t.hookCut).toBe(true);
  });

  it("mot de plus de 20 graphèmes : coupé au seuil", () => {
    const t = truncateCaption(`KO ${"a".repeat(30)}`, 10);
    expect(t.visible).toBe(`KO ${"a".repeat(7)}`);
  });

  it("compte en graphèmes : un emoji composé vaut un", () => {
    const t = truncateInstagram("👨‍👩‍👧 abc def", 5);
    expect(t.visible).toBe("👨‍👩‍👧 abc");
    expect(t.visibleCount).toBe(5);
  });
});

describe("autres plateformes", () => {
  it("Facebook : seuil en caractères, pas de limite de lignes", () => {
    const text = "a\nb\nc\nd\ne ".repeat(10);
    expect(truncateFacebook(text, 480).truncated).toBe(false);
    expect(truncateFacebook("mot ".repeat(200), 480).visibleCount).toBeLessThanOrEqual(480);
  });

  it("TikTok : deux lignes au plus", () => {
    expect(truncateTikTok("Une\nDeux\nTrois").visible).toBe("Une\nDeux");
  });

  it("X : partie au-delà de 280 isolée", () => {
    const ok = xSplit("KO !");
    expect(ok).toEqual({ valid: "KO !", overflow: "", weightedLength: 4 });
    const long = xSplit("a".repeat(300));
    expect(long.valid).toHaveLength(280);
    expect(long.overflow).toHaveLength(20);
    expect(long.weightedLength).toBe(300);
  });
});
