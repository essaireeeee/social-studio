"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { activeProfile, listProfiles } from "@/lib/editorial/profile-service";
import { loadRules } from "@/lib/editorial/rule-service";
import { activeSession } from "@/lib/shell/live-session";
import type { Mode } from "@/types/domain";
import { useRepository } from "./useRepository";

/** Données de la base utiles au Studio, mises à jour en direct. `undefined` : chargement. */
export function useStudioData(mode: Mode) {
  const repository = useRepository();
  return useLiveQuery(async () => {
    if (!repository) return undefined;
    const [settings, groups, signatures, fighters, events, session, profiles, rules] =
      await Promise.all([
        repository.getSettings(),
        repository.hashtagGroups.list(),
        repository.signatures.list(),
        repository.fighters.list(),
        repository.events.list(),
        activeSession(repository),
        listProfiles(repository, mode),
        loadRules(repository),
      ]);
    return {
      settings,
      groups: groups.filter((g) => g.modes.includes(mode)).sort((a, b) => a.order - b.order),
      allGroups: groups,
      signatures,
      fighters,
      events,
      session: session ?? null,
      profile: activeProfile(profiles),
      rules,
    };
  }, [repository, mode]);
}

export type StudioData = NonNullable<ReturnType<typeof useStudioData>>;
