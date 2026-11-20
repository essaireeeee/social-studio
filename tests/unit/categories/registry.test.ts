import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  CATEGORY_GROUPS,
  FIELDS,
  LIVE_SHORTCUTS,
  applyPresets,
  categoryFieldKeys,
  getCategoriesByGroup,
  getCategoriesByMode,
  getCategory,
  getCategoryByShortcut,
  getCategoryLayout,
  isFieldVisible,
  normalizeFightTime,
  resolveFieldOptions,
  validateBriefFields,
  winnerChoices,
} from "@/lib/categories/registry";
import { buildSeedData } from "@/lib/database/seed";
import { RULE_IDS } from "@/lib/editorial/rules";
import { SettingsSchema } from "@/types/domain";

const settings = SettingsSchema.parse({});
const category = (id: string) => {
  const found = getCategory(id);
  if (!found) throw new Error(`catégorie absente : ${id}`);
  return found;
};

describe("registre : volume et cohérence", () => {
  it("expose 12 catégories LIVE et 26 catégories DAILY, chacune avec au moins un champ requis", () => {
    expect(getCategoriesByMode("live")).toHaveLength(12);
    expect(getCategoriesByMode("daily")).toHaveLength(26);
    for (const def of CATEGORIES) expect(def.required.length).toBeGreaterThan(0);
  });

  it("a des identifiants uniques, préfixés par leur univers", () => {
    expect(new Set(CATEGORIES.map((c) => c.id)).size).toBe(CATEGORIES.length);
    for (const def of CATEGORIES) {
      expect(def.id).toMatch(def.mode === "live" ? /^live_/ : /^(daily|media|comm)_/);
    }
  });

  it("répartit les catégories DAILY en 4 groupes (7 sport, 6 événement, 8 médias, 5 communication)", () => {
    expect(CATEGORY_GROUPS.map((g) => g.id)).toEqual(["sport", "event", "media", "communication"]);
    expect(getCategoriesByGroup("sport")).toHaveLength(7);
    expect(getCategoriesByGroup("event")).toHaveLength(6);
    expect(getCategoriesByGroup("media")).toHaveLength(8);
    expect(getCategoriesByGroup("communication")).toHaveLength(5);
    for (const def of getCategoriesByMode("live")) expect(def.group).toBeUndefined();
  });

  it("ne référence que des champs définis, une seule fois par catégorie", () => {
    for (const def of CATEGORIES) {
      const keys = categoryFieldKeys(def);
      expect(new Set(keys).size).toBe(keys.length);
      for (const key of keys) expect(FIELDS[key], `${def.id} → ${key}`).toBeDefined();
      for (const key of Object.keys(def.presets ?? {})) expect(FIELDS[key]).toBeDefined();
      for (const key of Object.keys(def.fieldOptions ?? {})) expect(keys).toContain(key);
    }
    for (const field of Object.values(FIELDS)) {
      if (field.showIf) expect(FIELDS[field.showIf.field]).toBeDefined();
    }
  });

  it("attribue les raccourcis 1..9, 0, -, = aux 12 catégories LIVE, dans l'ordre", () => {
    expect(getCategoriesByMode("live").map((c) => c.shortcut)).toEqual([...LIVE_SHORTCUTS]);
    expect(getCategoryByShortcut("2")?.id).toBe("live_ko");
    expect(getCategoryByShortcut("=")?.id).toBe("live_moment");
    for (const def of getCategoriesByMode("daily")) expect(def.shortcut).toBeUndefined();
  });

  it("donne à chaque catégorie un libellé, un emoji et une consigne de ton", () => {
    for (const def of CATEGORIES) {
      expect(def.label.length).toBeGreaterThan(2);
      expect(def.emoji.length).toBeGreaterThan(0);
      expect(def.tone.length).toBeGreaterThan(20);
    }
  });

  it("ne référence que des signatures existantes", async () => {
    const { signatures } = await buildSeedData();
    const ids = new Set(signatures.map((s) => s.id));
    for (const def of CATEGORIES) {
      if (def.defaultSignatureId) expect(ids.has(def.defaultSignatureId)).toBe(true);
    }
  });
});

describe("registre : règles propres aux catégories (tableaux 7.2 et 7.3)", () => {
  it("live_ko : vainqueur et perdant requis, méthode pré-réglée sur KO, bascule TKO", () => {
    const ko = category("live_ko");
    expect(ko.required).toEqual(["winner", "loser"]);
    expect(applyPresets(ko)).toEqual({ method: "KO" });
    expect(resolveFieldOptions(FIELDS.method!, ko, { settings })).toEqual(["KO", "TKO"]);
  });

  it("live_ko : parcours rapide, round visible sans ouvrir « Plus de détails »", () => {
    const layout = getCategoryLayout(category("live_ko"));
    expect(layout.required.map((f) => f.key)).toEqual(["winner", "loser"]);
    expect(layout.promoted.map((f) => f.key)).toEqual(["method", "round"]);
    expect(layout.more.map((f) => f.key)).toEqual(["time", "highlight"]);
  });

  it("live_result : type de décision visible seulement si la méthode est Décision", () => {
    const result = category("live_result");
    expect(isFieldVisible("decisionType", result, { method: "KO" })).toBe(false);
    expect(isFieldVisible("decisionType", result, { method: "Décision" })).toBe(true);
    // live_decision n'a pas de champ méthode : le type de décision reste visible.
    expect(isFieldVisible("decisionType", category("live_decision"), {})).toBe(true);
  });

  it("live_result : le vainqueur se choisit entre les deux combattants saisis", () => {
    expect(winnerChoices(category("live_result"), { fighter1: "A", fighter2: "B" })).toEqual([
      "A",
      "B",
    ]);
    expect(winnerChoices(category("live_ko"), {})).toBeNull();
  });

  it("live_decision : unanime, partagée ou majoritaire", () => {
    expect(
      resolveFieldOptions(FIELDS.decisionType!, category("live_decision"), { settings }),
    ).toEqual(["Unanime", "Partagée", "Majoritaire"]);
  });

  it("live_sub : types de soumission avec saisie libre", () => {
    const options = resolveFieldOptions(FIELDS.submissionType!, category("live_sub"), { settings });
    expect(options).toContain("Étranglement arrière");
    expect(FIELDS.submissionType!.allowCustom).toBe(true);
  });

  it("live_defeat : contexte négatif, règle Samba Sima désactivée, pas de CTA billetterie", () => {
    const defeat = category("live_defeat");
    expect(defeat.context).toBe("negative");
    expect(defeat.disabledRules).toContain(RULE_IDS.sambaSima);
    expect(defeat.ticketingCta).toBe(false);
    expect(category("live_reaction").ticketingCta).toBe(false);
  });

  it("médias : formulaire commun, type de média pré-réglé", () => {
    for (const def of getCategoriesByGroup("media")) {
      expect(def.presets?.mediaType).toBeDefined();
      expect(FIELDS.mediaType!.options).toContain(def.presets?.mediaType);
    }
    expect(category("media_tv").required).toEqual(["person", "media", "airDate"]);
  });

  it("daily_main_event : position limitée à Main et Co-main", () => {
    expect(
      resolveFieldOptions(FIELDS.cardPosition!, category("daily_main_event"), { settings }),
    ).toEqual(["Main event", "Co-main event"]);
  });

  it("options lues dans les réglages et la fight card", () => {
    expect(resolveFieldOptions(FIELDS.round!, category("live_ko"), { settings })).toEqual([
      "R1",
      "R2",
      "R3",
      "R4",
      "R5",
    ]);
    expect(
      resolveFieldOptions(FIELDS.fights!, category("daily_fight_card"), {
        settings,
        fightCard: ["A vs B"],
      }),
    ).toEqual(["A vs B"]);
  });

  it("pré-remplissage : date, salle et ville depuis la session ou l'événement", () => {
    expect(FIELDS.date).toMatchObject({ fromSession: "date", fromEvent: "date" });
    expect(FIELDS.venue).toMatchObject({ fromSession: "venue", fromEvent: "venue" });
    expect(FIELDS.ticketLink).toMatchObject({ fromEvent: "ticketingUrl" });
  });
});

describe("validation du brief", () => {
  it("signale chaque champ requis manquant", () => {
    expect(validateBriefFields(category("live_ko"), { method: "KO" })).toEqual({
      winner: "Vainqueur : champ requis.",
      loser: "Perdant : champ requis.",
    });
    expect(validateBriefFields(category("live_ko"), { winner: "A", loser: "B" })).toEqual({});
  });

  it("vérifie le format des liens, des temps, des heures et des nombres", () => {
    const errors = validateBriefFields(category("media_interview"), {
      person: "A",
      media: "Radio Test",
      link: "pas-un-lien",
      airTime: "25h00",
    });
    expect(Object.keys(errors).sort()).toEqual(["airTime", "link"]);
    expect(
      validateBriefFields(category("live_ko"), { winner: "A", loser: "B", time: "3:72" }).time,
    ).toMatch(/m:ss/);
    expect(
      validateBriefFields(category("daily_countdown"), { event: "E", daysLeft: "trois" }).daysLeft,
    ).toMatch(/nombre/);
  });

  it("refuse un vainqueur qui n'est pas l'un des deux combattants", () => {
    const errors = validateBriefFields(category("live_result"), {
      fighter1: "A",
      fighter2: "B",
      winner: "C",
      method: "KO",
    });
    expect(errors.winner).toMatch(/l'un des deux combattants/);
  });

  it("met en forme le temps de combat (masque m:ss)", () => {
    expect(normalizeFightTime("312")).toBe("3:12");
    expect(normalizeFightTime("3.12")).toBe("3:12");
    expect(normalizeFightTime("45")).toBe("0:45");
    expect(normalizeFightTime("3:12")).toBe("3:12");
  });
});
