/**
 * Registre des catégories et des champs (sections 7.1 à 7.3).
 * Logique pure : utilisée par le formulaire du Studio, les moteurs et le classifieur.
 */
import type { BriefFieldValue, LiveSession, Mode, Settings } from "@/types/domain";
import { DAILY_CATEGORIES } from "./daily";
import { FIELDS } from "./fields";
import { LIVE_CATEGORIES } from "./live";
import type { CategoryDef, CategoryGroup, FieldDef } from "./types";

export type { CategoryDef, CategoryGroup, EditorialContext, FieldDef, FieldType } from "./types";
export { FIELDS } from "./fields";

export const CATEGORIES: readonly CategoryDef[] = [...LIVE_CATEGORIES, ...DAILY_CATEGORIES];

const BY_ID = new Map(CATEGORIES.map((category) => [category.id, category]));

export const CATEGORY_GROUPS: readonly { id: CategoryGroup; label: string }[] = [
  { id: "sport", label: "SPORT" },
  { id: "event", label: "ÉVÉNEMENT" },
  { id: "media", label: "MÉDIAS" },
  { id: "communication", label: "COMMUNICATION" },
];

/** Ordre des raccourcis clavier LIVE SHOW. */
export const LIVE_SHORTCUTS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0", "-", "="] as const;

/** Contexte fourni automatiquement par la Session Live (section 7.2). */
export const LIVE_SESSION_CONTEXT_KEYS = [
  "eventName",
  "eventNumber",
  "venue",
  "city",
  "date",
  "broadcast",
] as const satisfies readonly (keyof LiveSession)[];

export function getCategory(id: string): CategoryDef | undefined {
  return BY_ID.get(id);
}

export function getCategoriesByMode(mode: Mode): CategoryDef[] {
  return CATEGORIES.filter((category) => category.mode === mode);
}

/**
 * Proximité de deux catégories pour la recherche : 1 si identiques, 0,5 si même groupe
 * (DAILY) ou même famille (LIVE), 0 sinon.
 */
export function categoryProximity(a: string, b: string): 0 | 0.5 | 1 {
  if (a === b) return 1;
  const first = BY_ID.get(a);
  const second = BY_ID.get(b);
  if (!first || !second || first.mode !== second.mode) return 0;
  if (first.group && first.group === second.group) return 0.5;
  if (first.family && first.family === second.family) return 0.5;
  return 0;
}

export function getCategoriesByGroup(group: CategoryGroup): CategoryDef[] {
  return CATEGORIES.filter((category) => category.group === group);
}

export function getCategoryByShortcut(key: string): CategoryDef | undefined {
  return LIVE_CATEGORIES.find((category) => category.shortcut === key);
}

export function getField(key: string): FieldDef {
  const def = FIELDS[key];
  if (!def) throw new Error(`Champ inconnu dans le registre : ${key}`);
  return def;
}

// ---------------------------------------------------------------------------
// Formulaire
// ---------------------------------------------------------------------------

export interface CategoryLayout {
  /** Visibles d'emblée, marqués comme requis. */
  required: FieldDef[];
  /** Optionnels affichés d'emblée (`promote`). */
  promoted: FieldDef[];
  /** Optionnels repliés sous « Plus de détails ». */
  more: FieldDef[];
}

export function getCategoryLayout(category: CategoryDef): CategoryLayout {
  const optional = category.optional.map(getField);
  return {
    required: category.required.map(getField),
    promoted: optional.filter((def) => def.promote),
    more: optional.filter((def) => !def.promote),
  };
}

export function categoryFieldKeys(category: CategoryDef): string[] {
  return [...category.required, ...category.optional];
}

type BriefFields = Record<string, BriefFieldValue | undefined>;

export function hasValue(value: BriefFieldValue | undefined): boolean {
  if (value === undefined || value === false) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((item) => item.trim().length > 0);
  return true;
}

/** `showIf` ne s'applique que si le champ de référence fait partie de la catégorie. */
export function isFieldVisible(key: string, category: CategoryDef, fields: BriefFields): boolean {
  const condition = getField(key).showIf;
  if (!condition || !categoryFieldKeys(category).includes(condition.field)) return true;
  const value = fields[condition.field];
  const expected = typeof condition.equals === "string" ? [condition.equals] : condition.equals;
  return typeof value === "string" && expected.includes(value);
}

/** Le vainqueur se choisit par bascule si la catégorie contient les deux combattants sources. */
export function winnerChoices(category: CategoryDef, fields: BriefFields): string[] | null {
  const pickFrom = getField("winner").pickFrom;
  if (!pickFrom || !pickFrom.every((key) => categoryFieldKeys(category).includes(key))) return null;
  return pickFrom
    .map((key) => fields[key])
    .filter((v): v is string => typeof v === "string" && v.trim() !== "");
}

export interface OptionContext {
  settings: Pick<Settings, "quickOptions">;
  /** Libellés des combats de la fight card de l'événement choisi (« A vs B »). */
  fightCard?: string[];
}

export function resolveFieldOptions(
  def: FieldDef,
  category: CategoryDef,
  context: OptionContext,
): string[] {
  let options: string[];
  switch (def.options) {
    case undefined:
      return [];
    case "settings.rounds":
      options = [...context.settings.quickOptions.rounds];
      break;
    case "settings.methods":
      options = [...context.settings.quickOptions.methods];
      break;
    case "settings.broadcasters":
      options = [...context.settings.quickOptions.broadcasters];
      break;
    case "event.fightCard":
      options = [...(context.fightCard ?? [])];
      break;
    default:
      options = [...def.options];
  }
  const restriction = category.fieldOptions?.[def.key];
  return restriction ? options.filter((option) => restriction.includes(option)) : options;
}

/** Valeurs de départ d'un brief pour la catégorie (ex. méthode KO, type de média). */
export function applyPresets(category: CategoryDef, fields: BriefFields = {}): BriefFields {
  return { ...category.presets, ...fields };
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const FIGHT_TIME = /^([0-9]):([0-5][0-9])$/;
const CLOCK_TIME = /^([01]?[0-9]|2[0-3])\s*[h:]\s*([0-5][0-9])?$/i;

/** Masque m:ss : « 312 » → « 3:12 », « 3.12 » → « 3:12 ». Renvoie la saisie telle quelle si elle n'est pas interprétable. */
export function normalizeFightTime(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 3) return `${digits[0]}:${digits.slice(1)}`;
  if (digits.length === 2 && raw.includes(":") === false) return `0:${digits}`;
  const match = /^(\d)\D(\d{2})$/.exec(raw.trim());
  return match ? `${match[1]}:${match[2]}` : raw.trim();
}

export function isValidFightTime(value: string): boolean {
  return FIGHT_TIME.test(value);
}

export function isValidClockTime(value: string): boolean {
  return CLOCK_TIME.test(value.trim());
}

function isValidUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

/** Message par champ (clé → message), vide si le brief est complet et bien formé. */
export function validateBriefFields(
  category: CategoryDef,
  fields: BriefFields,
): Record<string, string> {
  const errors: Record<string, string> = {};

  for (const key of category.required) {
    if (!isFieldVisible(key, category, fields)) continue;
    if (!hasValue(fields[key])) errors[key] = `${getField(key).label} : champ requis.`;
  }

  for (const key of categoryFieldKeys(category)) {
    const value = fields[key];
    if (errors[key] || typeof value !== "string" || value.trim() === "") continue;
    const def = getField(key);
    if (def.type === "url" && !isValidUrl(value)) {
      errors[key] = "Lien invalide : il doit commencer par http:// ou https://.";
    } else if (def.type === "time" && def.timeFormat === "fight" && !isValidFightTime(value)) {
      errors[key] = "Temps invalide : format m:ss attendu (ex. 3:12).";
    } else if (def.type === "time" && def.timeFormat === "clock" && !isValidClockTime(value)) {
      errors[key] = "Heure invalide : format 20h30 attendu.";
    } else if (def.inputMode === "numeric" && !/^\d+$/.test(value.trim())) {
      errors[key] = `${def.label} : un nombre entier est attendu.`;
    }
  }

  const choices = winnerChoices(category, fields);
  const winner = fields.winner;
  if (
    choices &&
    typeof winner === "string" &&
    winner &&
    !errors.winner &&
    !choices.includes(winner)
  ) {
    errors.winner = "Le vainqueur doit être l'un des deux combattants saisis.";
  }

  return errors;
}
