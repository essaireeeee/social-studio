import type { FrenchRuleFamily } from "@/types/v2";

/** Familles de règles, dans l'ordre de la section 6.3. */
export const FAMILY_LABELS: Record<FrenchRuleFamily, string> = {
  homophones: "Homophones",
  accords: "Accords",
  participe_passe: "Participe passé",
  conjugaison: "Conjugaison",
  pluriels: "Pluriels",
  nombres: "Nombres",
  confusions: "Confusions",
  majuscules: "Majuscules",
  typographie: "Typographie",
  pleonasmes: "Pléonasmes",
  syntaxe: "Syntaxe et style",
  marque: "Marque",
};
