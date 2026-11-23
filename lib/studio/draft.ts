/**
 * Brouillon du Studio (section 13.3) : un brief en cours par mode, mémorisé entre les
 * sessions. Les champs communs (combattants, événement) suivent le CM d'un mode à l'autre ;
 * la catégorie et la plateforme restent propres à chaque mode. Logique pure.
 */
import {
  applyPresets,
  categoryFieldKeys,
  getCategory,
  getField,
  hasValue,
  validateBriefFields,
  type CategoryDef,
} from "@/lib/categories/registry";
import { commonFields, type BriefFields } from "@/lib/shell/mode";
import type { Brief, HashtagGroup, LiveSession, Mode, Platform, Signature } from "@/types/domain";

export interface StudioDraft {
  platform: Platform;
  categoryId?: string;
  fields: BriefFields;
  /** Absent : groupes cochés par défaut (`defaultOn`) pour le mode. */
  hashtagIds?: string[];
  /** `null` : « Aucune » choisie explicitement ; absent : signature par défaut de la catégorie. */
  signatureId?: string | null;
  cta?: string;
  freeInstruction?: string;
}

export type Drafts = Record<Mode, StudioDraft>;

export const emptyDraft = (platform: Platform = "instagram"): StudioDraft => ({
  platform,
  fields: {},
});

export const EMPTY_DRAFTS: Drafts = { live: emptyDraft(), daily: emptyDraft() };

/** Changement de mode : les champs communs du mode quitté remplacent ceux du mode d'arrivée. */
export function carryCommon(drafts: Drafts, from: Mode, to: Mode): Drafts {
  if (from === to) return drafts;
  const common = commonFields(drafts[from].fields);
  if (Object.keys(common).length === 0) return drafts;
  return { ...drafts, [to]: { ...drafts[to], fields: { ...drafts[to].fields, ...common } } };
}

/** Valeurs de la Session Live pour les champs de la catégorie encore vides. */
export function sessionPrefill(
  category: CategoryDef,
  fields: BriefFields,
  session: LiveSession | null | undefined,
): BriefFields {
  if (!session || category.mode !== "live") return fields;
  const next = { ...fields };
  for (const key of categoryFieldKeys(category)) {
    const source = getField(key).fromSession;
    const value = source ? session[source] : undefined;
    if (!hasValue(next[key]) && (typeof value === "string" || typeof value === "number")) {
      next[key] =
        typeof value === "string" ? value.slice(0, key === "date" ? 10 : undefined) : value;
    }
  }
  return next;
}

/** Choix d'une catégorie : préréglages, champs déjà saisis, contexte de la session. */
export function selectCategory(
  draft: StudioDraft,
  categoryId: string,
  session?: LiveSession | null,
): StudioDraft {
  const category = getCategory(categoryId);
  if (!category) return draft;
  const sameCategory = draft.categoryId === categoryId;
  // Les préréglages de l'ancienne catégorie (ex. méthode KO) ne passent pas à la nouvelle.
  const previous = getCategory(draft.categoryId ?? "");
  const kept = Object.fromEntries(
    Object.entries(draft.fields).filter(
      ([key, value]) => sameCategory || previous?.presets?.[key] !== value,
    ),
  );
  return {
    ...draft,
    categoryId,
    fields: sessionPrefill(category, applyPresets(category, kept), session),
    signatureId: sameCategory ? draft.signatureId : undefined,
  };
}

export function setField(draft: StudioDraft, key: string, value: BriefFields[string]): StudioDraft {
  return { ...draft, fields: { ...draft.fields, [key]: value } };
}

/** Réinitialiser : brief vide, même plateforme ; la Session Live reste active. */
export function resetDraft(draft: StudioDraft): StudioDraft {
  return emptyDraft(draft.platform);
}

export function defaultHashtagIds(groups: readonly HashtagGroup[], mode: Mode): string[] {
  return [...groups]
    .filter((g) => g.modes.includes(mode) && g.defaultOn)
    .sort((a, b) => a.order - b.order)
    .map((g) => g.id);
}

export function hashtagIdsOf(
  draft: StudioDraft,
  groups: readonly HashtagGroup[],
  mode: Mode,
): string[] {
  const available = new Set(groups.filter((g) => g.modes.includes(mode)).map((g) => g.id));
  return (draft.hashtagIds ?? defaultHashtagIds(groups, mode)).filter((id) => available.has(id));
}

export function signaturesFor(signatures: readonly Signature[], mode: Mode): Signature[] {
  return signatures
    .filter((s) => s.enabled && s.modes.includes(mode))
    .sort((a, b) => a.order - b.order);
}

/** Signature retenue : choix du CM, sinon celle par défaut de la catégorie si elle est disponible. */
export function signatureIdOf(
  draft: StudioDraft,
  signatures: readonly Signature[],
  mode: Mode,
): string | undefined {
  if (draft.signatureId === null) return undefined;
  const available = signaturesFor(signatures, mode).map((s) => s.id);
  if (draft.signatureId && available.includes(draft.signatureId)) return draft.signatureId;
  const fallback = getCategory(draft.categoryId ?? "")?.defaultSignatureId;
  return fallback && available.includes(fallback) ? fallback : undefined;
}

/** Brief envoyé aux moteurs : uniquement les champs de la catégorie, sans valeur vide. */
export function toBrief(
  draft: StudioDraft,
  mode: Mode,
  ctx: {
    groups: readonly HashtagGroup[];
    signatures: readonly Signature[];
    liveSessionId?: string;
  },
): Brief | null {
  const category = getCategory(draft.categoryId ?? "");
  if (!category || category.mode !== mode) return null;
  const keys = new Set([...categoryFieldKeys(category), ...Object.keys(category.presets ?? {})]);
  const fields = Object.fromEntries(
    Object.entries(draft.fields).filter(([key, value]) => keys.has(key) && hasValue(value)),
  );
  return {
    mode,
    categoryId: category.id,
    platform: draft.platform,
    fields,
    hashtagIds: hashtagIdsOf(draft, ctx.groups, mode),
    signatureId: signatureIdOf(draft, ctx.signatures, mode),
    cta: draft.cta?.trim() || undefined,
    liveSessionId: mode === "live" ? ctx.liveSessionId : undefined,
    freeInstruction: draft.freeInstruction?.trim() || undefined,
  };
}

/** Erreurs par champ au clic sur Générer, ou `category` si aucune catégorie n'est choisie. */
export function draftErrors(draft: StudioDraft, mode: Mode): Record<string, string> {
  const category = getCategory(draft.categoryId ?? "");
  if (!category || category.mode !== mode) return { category: "Choisissez une catégorie." };
  return validateBriefFields(category, draft.fields);
}

/** Brouillon reconstruit depuis une génération (réouverture depuis l'historique). */
export function draftFromBrief(brief: Brief): StudioDraft {
  return {
    platform: brief.platform,
    categoryId: brief.categoryId,
    fields: { ...brief.fields },
    hashtagIds: [...brief.hashtagIds],
    signatureId: brief.signatureId ?? null,
    cta: brief.cta,
    freeInstruction: brief.freeInstruction,
  };
}
