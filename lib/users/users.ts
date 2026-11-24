/**
 * Profils locaux (section 16.3) : nom, rôle CM ou administrateur, profil actif.
 * Contrôle de rôle local, sans authentification.
 */
import { newId } from "@/lib/database/hash";
import type { DataRepository } from "@/lib/database/repository";
import { UserProfileSchema, type UserProfile } from "@/types/domain";

export const ROLE_LABELS: Record<UserProfile["role"], string> = {
  cm: "Community manager",
  admin: "Administrateur",
};

export const LOCAL_ROLE_NOTICE = "Contrôle de rôle local, sans authentification.";

export class UserRuleError extends Error {}

/** Il reste toujours au moins un administrateur. */
export function checkUserChange(
  users: readonly UserProfile[],
  next: UserProfile | null,
  removedId?: string,
): void {
  const after = users
    .filter((u) => u.id !== removedId && u.id !== next?.id)
    .concat(next ? [next] : []);
  if (!after.some((u) => u.role === "admin")) {
    throw new UserRuleError("Il doit rester au moins un administrateur.");
  }
}

export async function saveUser(
  repository: DataRepository,
  input: { id?: string; name: string; role: UserProfile["role"] },
): Promise<UserProfile> {
  const user = UserProfileSchema.parse({
    id: input.id ?? newId(),
    name: input.name.trim(),
    role: input.role,
  });
  checkUserChange(await repository.users.list(), user);
  return repository.users.put(user);
}

export async function deleteUser(repository: DataRepository, id: string): Promise<void> {
  const settings = await repository.getSettings();
  if (settings.activeUserId === id) {
    throw new UserRuleError(
      "Le profil actif ne peut pas être supprimé : activez-en un autre d'abord.",
    );
  }
  checkUserChange(await repository.users.list(), null, id);
  await repository.users.delete(id);
}

export async function setActiveUser(repository: DataRepository, id: string): Promise<void> {
  const settings = await repository.getSettings();
  await repository.saveSettings({ ...settings, activeUserId: id });
}
