/**
 * Lecture et modification des règles éditoriales.
 * Contrôle de rôle local, sans authentification (section 16.3) : seul le profil
 * actif « admin » peut modifier ou activer une règle.
 */
import type { DataRepository } from "@/lib/database/repository";
import { EditorialRuleSchema, type EditorialRule, type UserProfile } from "@/types/domain";
import { DEFAULT_EDITORIAL_RULES, sortRules } from "./rules";

export class RulePermissionError extends Error {
  override name = "RulePermissionError";
  constructor() {
    super("Modification réservée au rôle administrateur.");
  }
}

export class RuleValidationError extends Error {
  override name = "RuleValidationError";
  constructor(readonly errors: string[]) {
    super(errors.join(" "));
  }
}

export function canEditRules(user: UserProfile | undefined): boolean {
  return user?.role === "admin";
}

/** Profil actif, d'après les réglages. */
export async function getActiveUser(repository: DataRepository): Promise<UserProfile | undefined> {
  const { activeUserId } = await repository.getSettings();
  return repository.users.get(activeUserId);
}

const VALID_FLAGS = /^[dgimsuy]*$/;

/** Liste des problèmes d'une règle (vide si elle est utilisable). */
export function validateRule(rule: EditorialRule): string[] {
  const errors: string[] = [];
  const parsed = EditorialRuleSchema.safeParse(rule);
  if (!parsed.success) {
    errors.push(`Règle invalide (${parsed.error.issues[0]?.path.join(".") || "racine"}).`);
  }

  if (
    rule.flags !== undefined &&
    (!VALID_FLAGS.test(rule.flags) || new Set(rule.flags).size !== rule.flags.length)
  ) {
    errors.push(`Options d'expression invalides : « ${rule.flags} ».`);
  }
  if (rule.pattern !== undefined) {
    try {
      new RegExp(rule.pattern, rule.flags);
    } catch (error) {
      errors.push(`Motif invalide : ${(error as Error).message}`);
    }
  }

  if (rule.kind === "replace" && (!rule.pattern || rule.replacement === undefined)) {
    errors.push("Une règle de remplacement exige un motif et un texte de remplacement.");
  }
  if (
    (rule.kind === "forbid" || rule.kind === "require") &&
    !rule.pattern &&
    !rule.values?.length
  ) {
    errors.push("Une règle d'interdiction ou d'exigence exige un motif ou une liste de valeurs.");
  }
  return errors;
}

/** Règles en base, triées dans l'ordre d'application. Valeurs par défaut si la table est vide. */
export async function loadRules(repository: DataRepository): Promise<EditorialRule[]> {
  const stored = await repository.rules.list();
  return sortRules(stored.length > 0 ? stored : DEFAULT_EDITORIAL_RULES);
}

export async function saveRule(
  repository: DataRepository,
  user: UserProfile | undefined,
  rule: EditorialRule,
): Promise<EditorialRule> {
  if (!canEditRules(user)) throw new RulePermissionError();
  const errors = validateRule(rule);
  if (errors.length > 0) throw new RuleValidationError(errors);
  return repository.rules.put(rule);
}

export async function setRuleEnabled(
  repository: DataRepository,
  user: UserProfile | undefined,
  id: string,
  enabled: boolean,
): Promise<EditorialRule> {
  if (!canEditRules(user)) throw new RulePermissionError();
  const rule = await repository.rules.get(id);
  if (!rule) throw new Error(`Règle introuvable : ${id}`);
  return repository.rules.put({ ...rule, enabled });
}
