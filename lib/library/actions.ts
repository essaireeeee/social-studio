/**
 * Écritures de la bibliothèque (section 14.1 et 14.2) : enregistrer une fiche, basculer
 * « Référence de style », supprimer. Contrôle des doublons avant enregistrement.
 * La confirmation de suppression est à la charge de l'interface.
 */
import { sha256Hex } from "@/lib/database/hash";
import type { DataRepository } from "@/lib/database/repository";
import { createWording } from "@/lib/database/wording-factory";
import { normalizeText } from "@/lib/editorial/text-utils";
import { detectDuplicates, type DedupeItem, type Duplicate } from "@/lib/import/dedupe";
import type { Fighter, Wording } from "@/types/domain";
import { inputFromForm, type WordingFormValues } from "./form";

/** Doublon exact ou très proche d'une publication de la bibliothèque (hors fiche modifiée). */
export async function checkDuplicate(
  text: string,
  library: readonly DedupeItem[],
  excludeId?: string,
): Promise<Duplicate> {
  if (!text.trim()) return { kind: "new" };
  const hash = await sha256Hex(normalizeText(text));
  const status = detectDuplicates(
    [{ id: "__form__", text, hash }],
    library.filter((item) => item.id !== excludeId),
  );
  return status.get("__form__") ?? { kind: "new" };
}

export const dedupeItems = (wordings: readonly Wording[]): DedupeItem[] =>
  wordings.map((w) => ({ id: w.id, text: w.text, hash: w.contentHash }));

/**
 * Crée (source `manual`) ou met à jour une publication. Une modification garde
 * l'identifiant, la source, la date de création et les marqueurs démo et référence.
 */
export async function saveWording(
  repository: DataRepository,
  values: WordingFormValues,
  options: { fighters: readonly Fighter[]; existing?: Wording; now?: Date },
): Promise<Wording> {
  const input = inputFromForm(values, options.fighters);
  const existing = options.existing;
  const created = await createWording(
    existing
      ? {
          ...input,
          id: existing.id,
          source: existing.source,
          isDemo: existing.isDemo,
          isReference: existing.isReference,
        }
      : { ...input, source: "manual" },
    options.now,
  );
  return repository.wordings.put(
    existing ? { ...created, createdAt: existing.createdAt } : created,
  );
}

export class ReferenceToggleError extends Error {}

/** Les exemples fictifs ne servent jamais de référence de style. */
export async function toggleReference(
  repository: DataRepository,
  wording: Wording,
  now: Date = new Date(),
): Promise<Wording> {
  if (wording.isDemo && !wording.isReference) {
    throw new ReferenceToggleError("Un exemple fictif ne peut pas servir de référence de style.");
  }
  return repository.wordings.put({
    ...wording,
    isReference: !wording.isReference,
    updatedAt: now.toISOString(),
  });
}

export async function deleteWording(repository: DataRepository, id: string): Promise<void> {
  await repository.wordings.delete(id);
}
