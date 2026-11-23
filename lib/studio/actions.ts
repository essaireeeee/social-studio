/**
 * Actions du Studio sur une génération enregistrée : chaque fonction relit la génération,
 * applique une transition pure (`revisions.ts`) et l'enregistre.
 */
import { getCategory, getField, categoryFieldKeys } from "@/lib/categories/registry";
import type { DataRepository } from "@/lib/database/repository";
import { createWording } from "@/lib/database/wording-factory";
import { buildBriefContext, findFighter } from "@/lib/generation/native/context";
import { saveHook } from "@/lib/generation/native/hooks";
import { activeSession } from "@/lib/shell/live-session";
import type { Generation, Platform, SavedHook, Wording } from "@/types/domain";
import {
  markPublished,
  recordEdit,
  reopenGeneration,
  restoreRevision,
  selectVariant,
  validateVariant,
  type EditInput,
} from "./revisions";

async function update(
  repository: DataRepository,
  id: string,
  fn: (generation: Generation) => Generation,
): Promise<Generation> {
  const generation = await repository.generations.get(id);
  if (!generation) throw new Error("Génération introuvable.");
  const next = fn(generation);
  if (next !== generation) await repository.generations.put(next);
  return next;
}

export async function saveEdit(
  repository: DataRepository,
  generationId: string,
  variantId: string,
  input: EditInput,
): Promise<string> {
  let revisionId = "";
  await update(repository, generationId, (g) => {
    const result = recordEdit(g, variantId, input);
    revisionId = result.revisionId;
    return result.generation;
  });
  return revisionId;
}

export const restore = (
  repository: DataRepository,
  id: string,
  variantId: string,
  revisionId: string,
) => update(repository, id, (g) => restoreRevision(g, variantId, revisionId, new Date()));

export const showInPreview = (repository: DataRepository, id: string, variantId: string) =>
  update(repository, id, (g) => selectVariant(g, variantId));

export const validate = (repository: DataRepository, id: string, variantId: string) =>
  update(repository, id, (g) => validateVariant(g, variantId, new Date()));

export const reopen = (repository: DataRepository, id: string) =>
  update(repository, id, (g) => reopenGeneration(g, new Date()));

export const publish = (
  repository: DataRepository,
  id: string,
  variantId: string,
  input: { publishedAt: string; url?: string },
) => update(repository, id, (g) => markPublished(g, variantId, { ...input, now: new Date() }));

/** « ⭐ Garder l'accroche » : la première ligne, généralisée en patron (banque d'accroches). */
export async function keepHook(
  repository: DataRepository,
  generation: Generation,
  text: string,
): Promise<SavedHook> {
  const category = getCategory(generation.brief.categoryId);
  if (!category) throw new Error("Catégorie inconnue.");
  const [fighters, events, session] = await Promise.all([
    repository.fighters.list(),
    repository.events.list(),
    activeSession(repository),
  ]);
  const context = buildBriefContext(generation.brief, category, {
    fighters,
    events,
    liveSession: generation.brief.mode === "live" ? session : undefined,
    hashtags: [],
  });
  const hook =
    text
      .split("\n")
      .find((line) => line.trim())
      ?.trim() ?? "";
  if (!hook) throw new Error("Aucune accroche à garder.");
  return saveHook(repository, {
    mode: generation.brief.mode,
    categoryId: category.id,
    text: hook,
    vars: context.vars,
  });
}

export interface LibraryEntryInput {
  text: string;
  /** Date de publication (AAAA-MM-JJ), facultative. */
  date?: string;
  instagramUrl?: string;
}

/** Enregistre le texte dans la bibliothèque (statut `validated`) et relie la génération. */
export async function saveToLibrary(
  repository: DataRepository,
  generation: Generation,
  input: LibraryEntryInput,
): Promise<Wording> {
  const { brief } = generation;
  const category = getCategory(brief.categoryId);
  const fighters = await repository.fighters.list();
  const fighterIds = category
    ? categoryFieldKeys(category)
        .filter((key) => getField(key).type === "fighter")
        .flatMap((key) => {
          const value = brief.fields[key];
          return Array.isArray(value) ? value : typeof value === "string" ? [value] : [];
        })
        .map((name) => findFighter(name, fighters)?.id)
        .filter((id): id is string => Boolean(id))
    : [];
  const wording = await createWording({
    text: input.text,
    mode: brief.mode,
    categoryId: brief.categoryId,
    platform: brief.platform,
    source: "studio",
    status: "validated",
    fighterIds: [...new Set(fighterIds)],
    date: input.date || undefined,
    instagramUrl: input.instagramUrl || undefined,
  });
  await repository.wordings.put(wording);
  await update(repository, generation.id, (g) => ({ ...g, savedToLibraryId: wording.id }));
  return wording;
}

/** Version déclinée modifiée par le CM (panneau des déclinaisons). */
export const saveDeclination = (
  repository: DataRepository,
  id: string,
  platform: Platform,
  text: string,
) =>
  update(repository, id, (g) =>
    g.declinations?.[platform] === text
      ? g
      : {
          ...g,
          declinations: { ...g.declinations, [platform]: text },
          updatedAt: new Date().toISOString(),
        },
  );
