import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import { runSeed } from "@/lib/database/seed";
import {
  RulePermissionError,
  RuleValidationError,
  canEditRules,
  getActiveUser,
  loadRules,
  saveRule,
  setRuleEnabled,
  validateRule,
} from "@/lib/editorial/rule-service";
import { DEFAULT_EDITORIAL_RULES, RULE_IDS, sortRules } from "@/lib/editorial/rules";
import type { EditorialRule, UserProfile } from "@/types/domain";
import { createTestRepository, disposeRepository, fixedNow } from "../../fixtures/entities";

const admin: UserProfile = { id: "u-admin", name: "Admin", role: "admin" };
const cm: UserProfile = { id: "u-cm", name: "CM", role: "cm" };

let repository: DexieRepository;

beforeEach(() => {
  repository = createTestRepository();
});

afterEach(async () => {
  await disposeRepository(repository);
});

describe("règles intégrées", () => {
  it("sont toutes valides, avec des identifiants et des ordres uniques", () => {
    for (const rule of DEFAULT_EDITORIAL_RULES) expect(validateRule(rule), rule.id).toEqual([]);
    expect(new Set(DEFAULT_EDITORIAL_RULES.map((r) => r.id)).size).toBe(
      DEFAULT_EDITORIAL_RULES.length,
    );
    expect(new Set(DEFAULT_EDITORIAL_RULES.map((r) => r.order)).size).toBe(
      DEFAULT_EDITORIAL_RULES.length,
    );
  });

  it("couvrent la section 1.6", () => {
    expect(Object.values(RULE_IDS).sort()).toEqual(DEFAULT_EDITORIAL_RULES.map((r) => r.id).sort());
  });
});

describe("validateRule", () => {
  const base: EditorialRule = {
    id: "custom",
    label: "Règle personnalisée",
    kind: "replace",
    pattern: "abc",
    replacement: "def",
    order: 0,
    enabled: true,
    editableBy: "admin",
  };

  it("accepte une règle complète", () => {
    expect(validateRule(base)).toEqual([]);
  });

  it("signale un motif ou des options invalides", () => {
    expect(validateRule({ ...base, pattern: "([" })[0]).toMatch(/Motif invalide/);
    expect(validateRule({ ...base, flags: "gg" })[0]).toMatch(/Options/);
    expect(validateRule({ ...base, flags: "x" })[0]).toMatch(/Options/);
  });

  it("exige motif et remplacement, ou motif / valeurs selon le type", () => {
    expect(validateRule({ ...base, replacement: undefined })).toHaveLength(1);
    expect(validateRule({ ...base, kind: "forbid", pattern: undefined, values: [] })).toHaveLength(
      1,
    );
    expect(validateRule({ ...base, kind: "forbid", pattern: undefined, values: ["x"] })).toEqual(
      [],
    );
  });
});

describe("modification réservée à l'administrateur", () => {
  it("canEditRules selon le rôle", () => {
    expect(canEditRules(admin)).toBe(true);
    expect(canEditRules(cm)).toBe(false);
    expect(canEditRules(undefined)).toBe(false);
  });

  it("un CM ne peut ni modifier ni désactiver une règle", async () => {
    await runSeed(repository, fixedNow());
    const rule = (await repository.rules.get(RULE_IDS.deHexagone))!;
    await expect(saveRule(repository, cm, { ...rule, label: "x" })).rejects.toBeInstanceOf(
      RulePermissionError,
    );
    await expect(setRuleEnabled(repository, cm, rule.id, false)).rejects.toBeInstanceOf(
      RulePermissionError,
    );
    expect((await repository.rules.get(rule.id))?.enabled).toBe(true);
  });

  it("l'administrateur active, désactive et enregistre des règles valides", async () => {
    await runSeed(repository, fixedNow());
    expect((await setRuleEnabled(repository, admin, RULE_IDS.sambaSima, false)).enabled).toBe(
      false,
    );

    const rule = (await repository.rules.get(RULE_IDS.sambaSima))!;
    const saved = await saveRule(repository, admin, {
      ...rule,
      values: [...(rule.values ?? []), "talent rare"],
    });
    expect(saved.values).toContain("talent rare");

    await expect(
      saveRule(repository, admin, { ...rule, kind: "replace", pattern: "(" }),
    ).rejects.toBeInstanceOf(RuleValidationError);
  });

  it("le profil actif est l'utilisateur par défaut, administrateur", async () => {
    await runSeed(repository, fixedNow());
    expect((await getActiveUser(repository))?.role).toBe("admin");
  });
});

describe("loadRules", () => {
  it("renvoie les règles intégrées si la table est vide", async () => {
    expect(await loadRules(repository)).toEqual(sortRules(DEFAULT_EDITORIAL_RULES));
  });

  it("renvoie les règles en base dans l'ordre d'application", async () => {
    await runSeed(repository, fixedNow());
    const rules = await loadRules(repository);
    expect(rules.map((r) => r.id).slice(0, 3)).toEqual([
      RULE_IDS.brandCase,
      RULE_IDS.deHexagone,
      RULE_IDS.ceintureTitre,
    ]);
  });
});
