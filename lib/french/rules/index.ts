/** Référentiel des règles de la couche 1 (section 6.3). */
import type { FrenchRule } from "../types";
import { ACCORD_RULES } from "./accords";
import { CONFUSION_RULES } from "./confusions";
import { CONJUGAISON_RULES } from "./conjugaison";
import { HOMOPHONE_RULES } from "./homophones";
import { MAJUSCULE_RULES } from "./majuscules";
import { NOMBRE_RULES } from "./nombres";
import { PARTICIPE_RULES } from "./participe";
import { STYLE_RULES } from "./style";
import { TYPOGRAPHIE_RULES } from "./typographie";

export const FRENCH_RULES: readonly FrenchRule[] = [
  ...HOMOPHONE_RULES,
  ...ACCORD_RULES,
  ...PARTICIPE_RULES,
  ...CONJUGAISON_RULES,
  ...NOMBRE_RULES,
  ...CONFUSION_RULES,
  ...MAJUSCULE_RULES,
  ...TYPOGRAPHIE_RULES,
  ...STYLE_RULES,
];

const BY_ID = new Map(FRENCH_RULES.map((rule) => [rule.id, rule]));

export function getFrenchRule(id: string): FrenchRule | undefined {
  return BY_ID.get(id);
}
