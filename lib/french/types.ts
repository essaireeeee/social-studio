/**
 * Atelier Français (section 6 de PROMPT_V2.md) : types du correcteur.
 * Logique pure, partagée client / serveur.
 */
import type {
  FrenchConfidence,
  FrenchLayer,
  FrenchLevel,
  FrenchRuleFamily,
  FrenchSeverity,
} from "@/types/v2";
import type { FrenchPrefsSettings, Mode } from "@/types/domain";

/** Règles maison et couches actives (Atelier Français > Réglages), dans les réglages V2. */
export type FrenchPrefs = FrenchPrefsSettings;

/** Correspondance trouvée par une règle : positions dans le texte analysé. */
export interface FrenchMatch {
  start: number;
  end: number;
  /** Texte de remplacement proposé ; absent pour une simple alerte. */
  replacement?: string;
  /** Message propre à cette occurrence ; sinon le titre de la règle. */
  message?: string;
}

/** Ce qu'une règle sait du contexte, en plus du texte. */
export interface RuleContext {
  prefs: FrenchPrefs;
  mode?: Mode;
  /** Formules d'IA de la règle éditoriale V1 (liste mutualisée). */
  aiFormulas: readonly string[];
  /** Noms des diffuseurs, dans leur graphie de référence (fiches événements). */
  broadcasters: readonly string[];
}

export interface FrenchExample {
  wrong: string;
  right: string;
}

/** Règle de la couche 1 (section 6.3). */
export interface FrenchRule {
  id: string;
  family: FrenchRuleFamily;
  level: FrenchLevel;
  severity: FrenchSeverity;
  /** `medium` : affiché « À vérifier ». */
  confidence: FrenchConfidence;
  /** Règle en une ligne. */
  title: string;
  /** Règle expliquée en deux phrases, rédigée pour l'application. */
  explanation: string;
  /** Exemples MMA : chaque `wrong` est détecté, chaque `right` ne l'est pas (tests). */
  examples: readonly FrenchExample[];
  /** Phrases correctes supplémentaires, pièges que la règle ne doit pas signaler. */
  alsoRight?: readonly string[];
  /** Faux : la correction de `wrong` ne donne pas exactement `right` (réécriture libre). */
  exactFix?: boolean;
  detect: (text: string, ctx: RuleContext) => FrenchMatch[];
  /** Correction appliquée sans confirmation par « Tout corriger » (typographie). */
  autofix?: boolean;
  /** Les noms du dictionnaire ne protègent pas ces correspondances (sigles, marque). */
  ignoreDictionary?: boolean;
  /** Faux : désactivée tant que le CM ne l'active pas. */
  enabledByDefault?: boolean;
  /** Réglages maison sous lesquels les exemples s'appliquent (apostrophe, nombres…). */
  testPrefs?: Partial<FrenchPrefs>;
  /** Mode sous lequel les exemples s'appliquent. */
  testMode?: Mode;
}

/** Alerte affichée : règle locale, LanguageTool ou relecture IA. */
export interface FrenchIssue {
  /** Stable pour un texte donné : `${layer}:${ruleId}:${start}`. */
  id: string;
  ruleId: string;
  family?: FrenchRuleFamily;
  layer: FrenchLayer;
  severity: FrenchSeverity;
  confidence: FrenchConfidence;
  start: number;
  end: number;
  /** Passage signalé, tel qu'écrit. */
  excerpt: string;
  replacement?: string;
  message: string;
  /** Correction sans confirmation possible (« Tout corriger »). */
  autofix: boolean;
}

export interface CheckContext {
  prefs?: Partial<FrenchPrefs>;
  mode?: Mode;
  aiFormulas?: readonly string[];
  broadcasters?: readonly string[];
  /** Mots et expressions jamais signalés (fiches, lexique MMA, ajouts du CM), en minuscules. */
  dictionary?: ReadonlySet<string>;
  /** Règles désactivées par l'administrateur. */
  disabledRules?: ReadonlySet<string>;
  /** Règles activées alors qu'elles sont désactivées par défaut. */
  enabledRules?: ReadonlySet<string>;
  /** Alertes ignorées ici : `ignoreKey(issue)`. */
  ignored?: ReadonlySet<string>;
  /** Catégorie « Réaction combattant » : les citations entre guillemets ne sont pas analysées. */
  categoryId?: string;
}

export const LEVEL_LABELS: Record<FrenchLevel, string> = {
  1: "Fautes courantes",
  2: "Intermédiaire",
  3: "Subtilités",
};

export const SEVERITY_LABELS: Record<FrenchSeverity, string> = {
  error: "Faute",
  warning: "À corriger",
  suggestion: "Suggestion",
};
