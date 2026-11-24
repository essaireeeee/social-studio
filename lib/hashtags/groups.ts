/**
 * Groupes de hashtags (section 15.3) : normalisation à la saisie (ajout du `#`, espaces
 * retirés), modes, état par défaut, ordre. Logique pure.
 */
import { HashtagGroupSchema, type HashtagGroup, type Mode } from "@/types/domain";

export type GroupKind = HashtagGroup["kind"];

export const KIND_LABELS: Record<GroupKind, string> = {
  official: "Officiel",
  mma_france: "MMA France",
  event: "Événement",
  fighter: "Combattant",
  campaign: "Campagne",
};

const VALID = /^#[\p{L}\p{N}_]+$/u;

/** « hexagone mma » → « #hexagonemma » ; `null` si le résultat n'est pas un hashtag valide. */
export function normalizeHashtag(raw: string): string | null {
  const compact = raw.replace(/\s+/gu, "").replace(/^#+/u, "");
  if (!compact) return null;
  const tag = `#${compact}`;
  return VALID.test(tag) ? tag : null;
}

/** Une saisie par ligne ou séparée par des virgules ; doublons retirés (casse ignorée). */
export function parseHashtagList(text: string): { tags: string[]; invalid: string[] } {
  const tags: string[] = [];
  const invalid: string[] = [];
  const seen = new Set<string>();
  for (const part of text.split(/[,;\n]/u)) {
    if (!part.trim()) continue;
    const tag = normalizeHashtag(part);
    if (!tag) invalid.push(part.trim());
    else if (!seen.has(tag.toLowerCase())) {
      seen.add(tag.toLowerCase());
      tags.push(tag);
    }
  }
  return { tags, invalid };
}

export interface GroupFormValues {
  name: string;
  kind: GroupKind;
  tagsText: string;
  defaultOn: boolean;
  modes: Mode[];
}

export const groupForm = (group?: HashtagGroup): GroupFormValues => ({
  name: group?.name ?? "",
  kind: group?.kind ?? "campaign",
  tagsText: group?.tags.join("\n") ?? "",
  defaultOn: group?.defaultOn ?? false,
  modes: group?.modes ?? ["live", "daily"],
});

export function groupFormErrors(values: GroupFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!values.name.trim()) errors.name = "Le nom est requis.";
  const { tags, invalid } = parseHashtagList(values.tagsText);
  if (invalid.length > 0) errors.tags = `Hashtag invalide : ${invalid.join(", ")}.`;
  else if (tags.length === 0) errors.tags = "Ajoutez au moins un hashtag.";
  if (values.modes.length === 0) errors.modes = "Choisissez au moins un mode.";
  return errors;
}

export function groupFromForm(
  values: GroupFormValues,
  options: { id: string; order: number },
): HashtagGroup {
  return HashtagGroupSchema.parse({
    id: options.id,
    name: values.name.trim(),
    kind: values.kind,
    tags: parseHashtagList(values.tagsText).tags,
    defaultOn: values.defaultOn,
    modes: values.modes,
    order: options.order,
  });
}

/** Déplace un élément et renumérote l'ordre de 0 à n-1. */
export function reorder<T extends { order: number }>(
  items: readonly T[],
  from: number,
  to: number,
): T[] {
  const sorted = [...items].sort((a, b) => a.order - b.order);
  if (from >= 0 && to >= 0 && from < sorted.length && to < sorted.length && from !== to) {
    const [moved] = sorted.splice(from, 1);
    sorted.splice(to, 0, moved!);
  }
  return sorted.map((item, order) => ({ ...item, order }));
}
