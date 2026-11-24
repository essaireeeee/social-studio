"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRepository } from "@/hooks/useRepository";
import type { Generation, HashtagGroup, Signature, Wording } from "@/types/domain";

export interface HistoryData {
  generations: Generation[];
  wordings: Wording[];
  groups: HashtagGroup[];
  signatures: Signature[];
}

/** Générations et données liées (références, hashtags, signatures), en direct. */
export function useHistoryData(): HistoryData | undefined {
  const repository = useRepository();
  return useLiveQuery(async () => {
    if (!repository) return undefined;
    const [generations, wordings, groups, signatures] = await Promise.all([
      repository.generations.list(),
      repository.wordings.list(),
      repository.hashtagGroups.list(),
      repository.signatures.list(),
    ]);
    return { generations, wordings, groups, signatures };
  }, [repository]);
}
