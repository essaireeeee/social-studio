import type { HexEvent, LiveSession, Mode } from "@/types/domain";

export type FieldType =
  | "fighter"
  | "text"
  | "textarea"
  | "chips"
  | "time"
  | "date"
  | "url"
  | "event"
  | "select"
  | "toggle";

/** Listes d'options lues dans les réglages ou dans l'événement, plutôt que figées. */
export type OptionSource =
  "settings.rounds" | "settings.methods" | "settings.broadcasters" | "event.fightCard";

/** Chaque champ est défini une seule fois, puis référencé par les catégories. */
export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  options?: readonly string[] | OptionSource;
  placeholder?: string;
  /** Aide affichée sous le champ. */
  helpText?: string;
  /** Pré-rempli par la Session Live (mode LIVE SHOW). */
  fromSession?: keyof LiveSession;
  /** Pré-rempli par la fiche événement choisie dans le brief. */
  fromEvent?: keyof HexEvent;
  /** Visible seulement si un autre champ de la catégorie a l'une de ces valeurs. */
  showIf?: { field: string; equals: string | readonly string[] };
  /** Champ optionnel affiché d'emblée, hors du bloc « Plus de détails ». */
  promote?: boolean;
  /** Sélection multiple (puces, combattants). */
  multiple?: boolean;
  /** Puces : autorise une valeur libre (« Autre »). */
  allowCustom?: boolean;
  /** Type `fighter` : si la catégorie contient ces deux champs, choix par bascule entre leurs valeurs. */
  pickFrom?: readonly [string, string];
  /** Type `time` : durée de combat (m:ss) ou heure de diffusion (20h30). */
  timeFormat?: "fight" | "clock";
  inputMode?: "numeric";
  maxLength?: number;
}

export type CategoryGroup = "sport" | "event" | "media" | "communication";

/**
 * Contexte éditorial de la catégorie. Sert notamment à la règle Samba Sima,
 * qui ne s'applique qu'en contexte positif.
 */
export type EditorialContext = "positive" | "neutral" | "negative";

export interface CategoryDef {
  id: string;
  mode: Mode;
  group?: CategoryGroup;
  /**
   * Famille des catégories LIVE (qui n'ont pas de groupe) : deux catégories de la même
   * famille sont « voisines » pour la recherche des références (section 9.1).
   */
  family?: "finish" | "title" | "presence" | "atmosphere";
  label: string;
  emoji: string;
  /** Touche 1..9, 0, -, = (LIVE SHOW uniquement). */
  shortcut?: string;
  required: readonly string[];
  optional: readonly string[];
  /** Valeurs posées dans le brief à la sélection de la catégorie (ex. méthode KO). */
  presets?: Readonly<Record<string, string>>;
  /** Restreint les options d'un champ pour cette catégorie (ex. KO / TKO). */
  fieldOptions?: Readonly<Record<string, readonly string[]>>;
  defaultSignatureId?: string;
  /** Consigne de ton transmise aux moteurs. */
  tone: string;
  context: EditorialContext;
  /** Règles éditoriales désactivées pour cette catégorie (ex. Samba Sima en défaite). */
  disabledRules?: readonly string[];
  /** Faux : jamais de CTA billetterie (défaite, réaction). */
  ticketingCta?: boolean;
}
