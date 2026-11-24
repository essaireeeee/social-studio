"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRepository } from "@/hooks/useRepository";
import type {
  Fighter,
  HashtagGroup,
  HexEvent,
  LiveSession,
  Signature,
  Wording,
} from "@/types/domain";

export interface DirectoryData {
  fighters: Fighter[];
  events: HexEvent[];
  wordings: Wording[];
  groups: HashtagGroup[];
  signatures: Signature[];
  /** Session Live en cours, s'il y en a une. */
  session: LiveSession | null;
}

/** Fiches combattants, événements, hashtags et signatures, en direct. `undefined` au chargement. */
export function useDirectoryData(): DirectoryData | undefined {
  const repository = useRepository();
  return useLiveQuery(async () => {
    if (!repository) return undefined;
    const [fighters, events, wordings, groups, signatures, sessions] = await Promise.all([
      repository.fighters.list(),
      repository.events.list(),
      repository.wordings.list(),
      repository.hashtagGroups.list(),
      repository.signatures.list(),
      repository.liveSessions.list({ filter: (s) => s.active }),
    ]);
    return {
      fighters,
      events,
      wordings,
      groups: groups.sort((a, b) => a.order - b.order),
      signatures: signatures.sort((a, b) => a.order - b.order),
      session: sessions[0] ?? null,
    };
  }, [repository]);
}
