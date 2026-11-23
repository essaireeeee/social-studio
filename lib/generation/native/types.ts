/**
 * DSL des modèles du moteur natif (section 10.2).
 *
 * Dans une option, `{var}` insère une variable du contexte, `{var|upper}`, `{var|lower}`,
 * `{var|cap}` la transforment, `{VAR_UPPER}` équivaut à `{var|upper}`, `{E}` réserve un
 * emplacement d'emoji, `{?var}` exige la variable sans l'afficher.
 * Une option dont une variable manque est écartée ; un segment sans option restante est
 * supprimé. Un modèle dont l'accroche (H) disparaît n'est pas éligible.
 */
import type { Brief, VariantKind } from "@/types/domain";

export type Block = "H" | "B" | "I" | "Q" | "C" | "T" | "S";

/** Rôle d'un segment : sert à l'ordre, au raccourcissement et aux statistiques. */
export type SegmentRole =
  | "hook"
  | "core"
  | "detail"
  | "info"
  | "context"
  | "story"
  | "closing"
  | "question"
  | "quote"
  | "samba"
  | "cta"
  | "signature"
  | "hashtags";

export interface Segment {
  block: Block;
  role: SegmentRole;
  /** Formulations alternatives. */
  options: readonly string[];
  /** Variables sans lesquelles le segment est supprimé (calculées depuis les options si absentes). */
  requires?: readonly string[];
  when?: (brief: Brief) => boolean;
  /** Vrai : la ligne rejoint le paragraphe précédent au lieu d'en ouvrir un. */
  join?: boolean;
}

export interface Template {
  id: string;
  categoryIds: readonly string[];
  variant: VariantKind;
  /** Empreinte nominale, avant suppression des segments sans données (ex. « H-B-T »). */
  structure: string;
  segments: readonly Segment[];
}

/** Variables disponibles pour un brief : uniquement des valeurs renseignées. */
export type VariableMap = Readonly<Record<string, string>>;
