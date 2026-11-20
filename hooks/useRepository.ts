"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { getDataServices } from "@/lib/database/client";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import { getActiveUser } from "@/lib/editorial/rule-service";
import { useDataStore } from "@/stores/data.store";
import type { UserProfile } from "@/types/domain";

/** Repository du navigateur, disponible une fois les données prêtes (seed ou restauration faits). */
export function useRepository(): DexieRepository | null {
  const ready = useDataStore((state) => state.phase === "ready");
  return ready ? getDataServices().repository : null;
}

/** Profil actif (réglages → utilisateurs), mis à jour en direct. `undefined` pendant le chargement. */
export function useActiveUser(): UserProfile | null | undefined {
  const repository = useRepository();
  return useLiveQuery(
    async () => (repository ? ((await getActiveUser(repository)) ?? null) : undefined),
    [repository],
  );
}
