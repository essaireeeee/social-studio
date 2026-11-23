"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRepository } from "@/hooks/useRepository";
import type { Fighter, HexEvent, Wording } from "@/types/domain";

export interface LibraryData {
  wordings: Wording[];
  fighters: Fighter[];
  events: HexEvent[];
}

/** Bibliothèque, combattants et événements, mis à jour en direct. `undefined` au chargement. */
export function useLibraryData(): LibraryData | undefined {
  const repository = useRepository();
  return useLiveQuery(async () => {
    if (!repository) return undefined;
    const [wordings, fighters, events] = await Promise.all([
      repository.wordings.list(),
      repository.fighters.list(),
      repository.events.list(),
    ]);
    return { wordings, fighters, events };
  }, [repository]);
}
