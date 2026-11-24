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
import { findEvent } from "@/lib/generation/native/context";
import { commonFields, type BriefFields } from "@/lib/shell/mode";
import type {
  Brief,
  HashtagGroup,
  HexEvent,
  LiveSession,
  Mode,
  Platform,
  Signature,
} from "@/types/domain";

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

/** Valeur d'un champ tirée d'une fiche événement (`fromEvent`), au format du formulaire. */
function eventValue(event: HexEvent | undefined, key: string): string | undefined {
  const source = getField(key).fromEvent;
  const value = event && source ? event[source] : undefined;
  if (typeof value !== "string" || !value.trim()) return undefined;
  return key === "date" ? value.slice(0, 10) : value;
}

const eventOf = (value: BriefFields[string], events: readonly HexEvent[]) =>
  typeof value === "string" && value.trim() ? findEvent(value, events) : undefined;

/**
 * Événement choisi dans le brief (section 15.2) : date, salle, ville et billetterie de la
 * fiche remplissent les champs de la catégorie encore vides, ou ceux qui portaient encore
 * les valeurs de l'événement précédent. Une saisie du CM n'est jamais écrasée.
 */
export function setEventField(
  draft: StudioDraft,
  value: BriefFields[string],
  events: readonly HexEvent[],
): StudioDraft {
  const previous = eventOf(draft.fields.event, events);
  const next = eventOf(value, events);
  const fields: BriefFields = { ...draft.fields, event: value };
  const category = getCategory(draft.categoryId ?? "");
  for (const key of category ? categoryFieldKeys(category) : []) {
    if (!getField(key).fromEvent) continue;
    const before = eventValue(previous, key);
    const current = fields[key];
    if (hasValue(current) && current !== before) continue;
    const after = eventValue(next, key);
    if (after !== undefined) fields[key] = after;
    else delete fields[key];
  }
  return { ...draft, fields };
}

/** Champs `fromEvent` encore vides, remplis depuis l'événement déjà choisi. */
export function eventPrefill(
  category: CategoryDef,
  fields: BriefFields,
  events: readonly HexEvent[],
): BriefFields {
  const event = eventOf(fields.event, events);
  if (!event) return fields;
  const next = { ...fields };
  for (const key of categoryFieldKeys(category)) {
    const value = eventValue(event, key);
    if (value !== undefined && !hasValue(next[key])) next[key] = value;
  }
  return next;
}

/** Choix d'une catégorie : préréglages, champs déjà saisis, contexte de la session et de l'événement. */
export function selectCategory(
  draft: StudioDraft,
  categoryId: string,
  session?: LiveSession | null,
  events: readonly HexEvent[] = [],
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
    fields: eventPrefill(
      category,
      sessionPrefill(category, applyPresets(category, kept), session),
      events,
    ),
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
