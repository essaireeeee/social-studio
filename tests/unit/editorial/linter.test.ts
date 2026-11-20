import { describe, expect, it } from "vitest";
import {
  fixFrenchSpacing,
  formatFixSummary,
  lintText,
  removeDuplicateHashtags,
} from "@/lib/editorial/linter";
import { DEFAULT_EDITORIAL_RULES, RULE_IDS } from "@/lib/editorial/rules";
import type { EditorialRule } from "@/types/domain";

const NBSP = String.fromCharCode(0xa0);
/** Linter sans les espaces typographiques, pour isoler les autres règles. */
const plain = (text: string, extra: Parameters<typeof lintText>[1] = {}) =>
  lintText(text, { frenchSpacing: false, ...extra });

const rulesWith = (id: string, patch: Partial<EditorialRule>): EditorialRule[] =>
  DEFAULT_EDITORIAL_RULES.map((rule) => (rule.id === id ? { ...rule, ...patch } : rule));

describe("règle « de HEXAGONE MMA »", () => {
  it("« la victoire d'HEXAGONE MMA » devient « la victoire de HEXAGONE MMA »", () => {
    const result = plain("la victoire d'HEXAGONE MMA");
    expect(result.text).toBe("la victoire de HEXAGONE MMA");
    expect(result.fixes).toEqual([
      { ruleId: RULE_IDS.deHexagone, label: expect.any(String), count: 1 },
    ]);
  });

  it("« la ceinture de HEXAGONE MMA » devient « la ceinture d'HEXAGONE MMA »", () => {
    expect(plain("la ceinture de HEXAGONE MMA").text).toBe("la ceinture d'HEXAGONE MMA");
  });

  it("« le titre d'HEXAGONE MMA » reste inchangé", () => {
    const result = plain("le titre d'HEXAGONE MMA");
    expect(result.text).toBe("le titre d'HEXAGONE MMA");
    expect(result.fixes).toEqual([]);
  });

  it("gère l'apostrophe typographique et la majuscule en début de phrase", () => {
    expect(plain("Les combattants d’HEXAGONE MMA").text).toBe("Les combattants de HEXAGONE MMA");
    expect(plain("D'HEXAGONE MMA à Paris").text).toBe("De HEXAGONE MMA à Paris");
  });

  it("garde « d' » si ceinture ou titre figure dans les 3 mots précédents", () => {
    expect(plain("la ceinture des légers d'HEXAGONE MMA").text).toBe(
      "la ceinture des légers d'HEXAGONE MMA",
    );
    expect(plain("le titre de champion d'HEXAGONE MMA").text).toBe(
      "le titre de champion d'HEXAGONE MMA",
    );
    expect(plain("La Ceinture d'HEXAGONE MMA").text).toBe("La Ceinture d'HEXAGONE MMA");
  });

  it("convertit au-delà de la fenêtre de 3 mots", () => {
    expect(plain("la ceinture des poids légers d'HEXAGONE MMA").text).toBe(
      "la ceinture des poids légers de HEXAGONE MMA",
    );
  });

  it("met aussi au pluriel : « les ceintures d'HEXAGONE MMA »", () => {
    expect(plain("les ceintures de HEXAGONE MMA").text).toBe("les ceintures d'HEXAGONE MMA");
  });
});

describe("casse de la marque", () => {
  it("corrige les variantes de casse dans le texte, pas dans les hashtags", () => {
    const result = plain("Hexagone MMA et hexagone mma #HexagoneMMA #hexagonemma");
    expect(result.text.startsWith("HEXAGONE MMA et HEXAGONE MMA")).toBe(true);
    expect(result.text).toContain("#HexagoneMMA");
    expect(result.fixes.find((f) => f.ruleId === RULE_IDS.brandCase)?.count).toBe(2);
  });

  it("enchaîne casse puis « de » : « la soirée d'Hexagone MMA »", () => {
    const result = plain("la soirée d'Hexagone MMA");
    expect(result.text).toBe("la soirée de HEXAGONE MMA");
    expect(result.fixes.map((f) => f.ruleId)).toEqual([RULE_IDS.brandCase, RULE_IDS.deHexagone]);
  });
});

describe("hashtags en double", () => {
  it("supprime les doublons, quelle que soit la casse, et les lignes vidées", () => {
    const result = removeDuplicateHashtags("KO !\n#HexagoneMMA #MMA #hexagonemma\n#mma");
    expect(result).toEqual({ text: "KO !\n#HexagoneMMA #MMA", count: 2 });
  });

  it("supprime aussi un doublon en début de ligne sans laisser d'espace", () => {
    expect(removeDuplicateHashtags("#A texte\n#a #B").text).toBe("#A texte\n#B");
  });
});

describe("espaces typographiques", () => {
  it("insère une espace insécable avant ! ? : ;", () => {
    expect(fixFrenchSpacing("KO !", true).text).toBe(`KO${NBSP}!`);
    expect(fixFrenchSpacing("KO!", true).text).toBe(`KO${NBSP}!`);
    expect(fixFrenchSpacing("Quoi?!", true).text).toBe(`Quoi${NBSP}?!`);
    expect(fixFrenchSpacing("Programme: ce soir", true).text).toBe(`Programme${NBSP}: ce soir`);
  });

  it("ne touche ni aux heures, ni au temps de combat, ni aux liens", () => {
    const text = "Coup d'envoi 20:30, fin à 3:12. https://exemple.fr/billets?promo=1!";
    expect(fixFrenchSpacing(text, true).text).toBe(text);
  });

  it("supprime les espaces doubles, même sans espace insécable", () => {
    expect(fixFrenchSpacing("KO  au   R1", false)).toEqual({ text: "KO au R1", count: 2 });
    expect(fixFrenchSpacing("KO !", false).text).toBe("KO !");
  });

  it("le linter est idempotent", () => {
    const first = lintText(
      "Hexagone MMA  frappe fort!\nLa ceinture de HEXAGONE MMA : quelle soirée?\n#MMA #mma",
    );
    const second = lintText(first.text);
    expect(second.text).toBe(first.text);
    expect(second.fixes).toEqual([]);
  });
});

describe("avertissements", () => {
  it("trop d'emojis : seuil 6 par défaut, ou p90 du profil", () => {
    const text = "💥🔥🏆🥊👊⚡🎯 KO";
    expect(plain(text).warnings.map((w) => w.kind)).toContain("emoji_overload");
    expect(plain(text, { emojiThreshold: 10 }).warnings).toEqual([]);
  });

  it("accroche identique ou trop proche d'une génération validée récente", () => {
    const text = "💥 KO de Jean Testeur au premier round !\n\nSuite du texte.";
    const identical = plain(text, { recentHooks: ["KO de Jean Testeur au premier round !"] });
    expect(identical.warnings[0]).toMatchObject({ kind: "repetitive_hook", start: 0 });
    expect(identical.warnings[0]?.message).toMatch(/identique/);

    const close = plain(text, { recentHooks: ["KO de Jean Testeur au premier round"] });
    expect(close.warnings[0]?.kind).toBe("repetitive_hook");

    expect(plain(text, { recentHooks: ["Billetterie ouverte pour la soirée"] }).warnings).toEqual(
      [],
    );
  });

  it("formules typiques d'IA, quelle que soit l'accentuation ou l'apostrophe", () => {
    const result = plain("Plongez dans l'ambiance. N’hesitez pas a venir.");
    const ai = result.warnings.filter((w) => w.kind === "ai_formula");
    expect(ai.map((w) => w.message)).toEqual([
      "Formule typique d'IA à éviter : « Plongez dans ».",
      "Formule typique d'IA à éviter : « N'hésitez pas à ».",
    ]);
    expect(result.text.slice(ai[0]!.start, ai[0]!.end)).toBe("Plongez dans");
  });

  it("« véritable » interdit en ouverture seulement", () => {
    expect(plain("🔥 Véritable démonstration ce soir").warnings.map((w) => w.kind)).toEqual([
      "ai_formula",
    ]);
    expect(plain("Une véritable démonstration ce soir").warnings).toEqual([]);
  });

  it("question finale interdite sur les catégories factuelles", () => {
    const text = "💥 KO de Jean Testeur.\nQui sera le prochain ? 🔥\n\n#HexagoneMMA";
    const ko = plain(text, { categoryId: "live_ko" });
    expect(ko.warnings.map((w) => w.kind)).toEqual(["final_question"]);
    expect(ko.text.slice(ko.warnings[0]!.start, ko.warnings[0]!.end)).toBe(
      "Qui sera le prochain ? 🔥",
    );
    expect(plain(text, { categoryId: "daily_fight_announce" }).warnings).toEqual([]);
  });

  it("dépassement de limite plateforme", () => {
    const long = "KO ".repeat(100);
    expect(plain(long, { platform: "x" }).warnings.map((w) => w.kind)).toEqual(["platform_limit"]);
    expect(plain(long, { platform: "instagram" }).warnings).toEqual([]);
    const tags = Array.from({ length: 31 }, (_, i) => `#Tag${i}`).join(" ");
    expect(plain(tags, { platform: "instagram" }).warnings.map((w) => w.kind)).toEqual([
      "hashtag_limit",
    ]);
  });
});

describe("règle Samba Sima", () => {
  const suggestion = (text: string, extra: Parameters<typeof lintText>[1] = {}) =>
    plain(text, extra).warnings.filter((w) => w.kind === "samba_sima");

  it("suggère un qualificatif dans un contexte positif", () => {
    const text = "💥 KO de Samba Sima au premier round.";
    const found = suggestion(text, {
      categoryId: "live_ko",
      fields: { winner: "Samba Sima", loser: "Jean Testeur" },
    });
    expect(found).toHaveLength(1);
    const start = text.indexOf("Samba Sima");
    expect(found[0]).toMatchObject({ severity: "suggestion", start, end: start + 10 });
  });

  it("ne dit rien si un qualificatif est présent", () => {
    expect(suggestion("Le crack Samba Sima s'impose.", { categoryId: "live_ko" })).toEqual([]);
    expect(suggestion("Samba Sima, le phénomène, s'impose.", { categoryId: "live_ko" })).toEqual(
      [],
    );
  });

  it("jamais en contexte de défaite", () => {
    expect(suggestion("Samba Sima s'incline ce soir.", { categoryId: "live_defeat" })).toEqual([]);
    expect(
      suggestion("Jean Testeur l'emporte face à Samba Sima.", {
        categoryId: "live_ko",
        fields: { winner: "Jean Testeur", loser: "Samba Sima" },
      }),
    ).toEqual([]);
    expect(
      suggestion("Victoire de Jean Testeur face à Samba Sima.", {
        categoryId: "live_result",
        fields: {
          fighter1: "Samba Sima",
          fighter2: "Jean Testeur",
          winner: "Jean Testeur",
          method: "KO",
        },
      }),
    ).toEqual([]);
    expect(suggestion("Défaite pour Samba Sima ce soir.")).toEqual([]);
  });

  it("pas de suggestion dans une catégorie neutre", () => {
    expect(
      suggestion("Communiqué concernant Samba Sima.", { categoryId: "comm_statement" }),
    ).toEqual([]);
  });
});

describe("règles en base", () => {
  it("une règle désactivée ne s'applique plus", () => {
    const rules = rulesWith(RULE_IDS.deHexagone, { enabled: false });
    expect(plain("la victoire d'HEXAGONE MMA", { rules }).text).toBe("la victoire d'HEXAGONE MMA");
  });

  it("applique les règles personnalisées et ignore un motif invalide", () => {
    const rules: EditorialRule[] = [
      ...DEFAULT_EDITORIAL_RULES,
      {
        id: "custom-replace",
        label: "Gala → soirée",
        kind: "replace",
        pattern: "\\bgala\\b",
        flags: "gi",
        replacement: "soirée",
        order: 200,
        enabled: true,
        editableBy: "admin",
      },
      {
        id: "custom-broken",
        label: "Cassée",
        kind: "replace",
        pattern: "([",
        replacement: "x",
        order: 201,
        enabled: true,
        editableBy: "admin",
      },
      {
        id: "custom-forbid",
        label: "Mot interdit",
        kind: "forbid",
        values: ["incroyable"],
        order: 202,
        enabled: true,
        editableBy: "admin",
      },
      {
        id: "custom-require",
        label: "Mention du lien en bio",
        kind: "require",
        values: ["lien en bio"],
        order: 203,
        enabled: true,
        editableBy: "admin",
      },
    ];
    const result = plain("Un gala incroyable.", { rules });
    expect(result.text).toBe("Un soirée incroyable.");
    expect(result.warnings.map((w) => w.kind)).toEqual(["forbidden", "required_missing"]);
  });

  it("résume les corrections appliquées", () => {
    expect(formatFixSummary([])).toBe("");
    expect(formatFixSummary([{ ruleId: "a", label: "A", count: 1 }])).toBe(
      "1 correction éditoriale appliquée",
    );
    expect(
      formatFixSummary([
        { ruleId: "a", label: "A", count: 2 },
        { ruleId: "b", label: "B", count: 1 },
      ]),
    ).toBe("3 corrections éditoriales appliquées");
  });
});
