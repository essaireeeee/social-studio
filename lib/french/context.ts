/** Contexte du correcteur, construit à partir de la base (logique pure). */
import { RULE_IDS } from "@/lib/editorial/rules";
import type { EditorialRule, Fighter, HexEvent, LiveSession, Settings } from "@/types/domain";
import type { FrenchDictionaryEntry, FrenchRuleState } from "@/types/v2";
import { buildDictionary } from "./dictionary";
import { DEFAULT_AI_FORMULAS } from "./engine";
import { getFrenchRule } from "./rules";
import type { CheckContext } from "./types";

export interface FrenchSources {
  settings: Settings;
  fighters: readonly Fighter[];
  events: readonly HexEvent[];
  sessions: readonly LiveSession[];
  entries: readonly FrenchDictionaryEntry[];
  ruleStates: readonly FrenchRuleState[];
  editorialRules: readonly EditorialRule[];
}

/** Règles désactivées et règles activées à la main (état de la table `frenchRules`). */
export function ruleToggles(states: readonly FrenchRuleState[]) {
  const disabledRules = new Set<string>();
  const enabledRules = new Set<string>();
  for (const state of states) {
    const rule = getFrenchRule(state.id);
    if (!rule) continue;
    if (!state.enabled) disabledRules.add(state.id);
    else if (rule.enabledByDefault === false) enabledRules.add(state.id);
  }
  return { disabledRules, enabledRules };
}

/** Une règle est-elle active, compte tenu de l'état enregistré ? */
export function isRuleEnabled(id: string, states: readonly FrenchRuleState[]): boolean {
  const state = states.find((s) => s.id === id);
  if (state) return state.enabled;
  return getFrenchRule(id)?.enabledByDefault !== false;
}

export function buildCheckContext(sources: FrenchSources): CheckContext {
  const formulas = sources.editorialRules.find((r) => r.id === RULE_IDS.aiFormulas);
  return {
    prefs: sources.settings.french,
    dictionary: buildDictionary(sources),
    ...ruleToggles(sources.ruleStates),
    aiFormulas: formulas && formulas.enabled ? (formulas.values ?? DEFAULT_AI_FORMULAS) : [],
    broadcasters: [...new Set(sources.events.flatMap((e) => e.broadcasters.map((b) => b.name)))],
  };
}
