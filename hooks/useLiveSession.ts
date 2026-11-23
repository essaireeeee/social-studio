"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { activeSession } from "@/lib/shell/live-session";
import type { LiveSession } from "@/types/domain";
import { useRepository } from "./useRepository";

/** Session Live active, mise à jour en direct. `undefined` : chargement ; `null` : aucune. */
export function useLiveSession(): LiveSession | null | undefined {
  const repository = useRepository();
  return useLiveQuery(
    async () => (repository ? ((await activeSession(repository)) ?? null) : undefined),
    [repository],
  );
}
