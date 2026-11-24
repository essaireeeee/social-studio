/** Écritures des groupes de hashtags et des signatures. */
import { newId } from "@/lib/database/hash";
import type { DataRepository } from "@/lib/database/repository";
import type { HashtagGroup, Signature } from "@/types/domain";
import { groupFromForm, reorder, type GroupFormValues } from "./groups";
import { signatureFromForm, type SignatureFormValues } from "./signatures";

const nextOrder = (items: readonly { order: number }[]) =>
  items.reduce((max, item) => Math.max(max, item.order + 1), 0);

export async function saveGroup(
  repository: DataRepository,
  values: GroupFormValues,
  existing?: HashtagGroup,
): Promise<HashtagGroup> {
  const order = existing?.order ?? nextOrder(await repository.hashtagGroups.list());
  return repository.hashtagGroups.put(
    groupFromForm(values, { id: existing?.id ?? newId(), order }),
  );
}

export async function saveSignature(
  repository: DataRepository,
  values: SignatureFormValues,
  existing?: Signature,
): Promise<Signature> {
  const order = existing?.order ?? nextOrder(await repository.signatures.list());
  return repository.signatures.put(
    signatureFromForm(values, { id: existing?.id ?? newId(), order }),
  );
}

/** Réordonne et enregistre toute la liste (ordre 0 à n-1). */
export async function moveGroup(
  repository: DataRepository,
  groups: readonly HashtagGroup[],
  from: number,
  to: number,
): Promise<void> {
  await repository.hashtagGroups.bulkPut(reorder(groups, from, to));
}

export async function moveSignature(
  repository: DataRepository,
  signatures: readonly Signature[],
  from: number,
  to: number,
): Promise<void> {
  await repository.signatures.bulkPut(reorder(signatures, from, to));
}

/** Les briefs qui citaient l'élément l'ignorent simplement (identifiant absent). */
export const deleteGroup = (repository: DataRepository, id: string) =>
  repository.hashtagGroups.delete(id);
export const deleteSignature = (repository: DataRepository, id: string) =>
  repository.signatures.delete(id);
