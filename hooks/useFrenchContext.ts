"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useMemo } from "react";
import { loadRules } from "@/lib/editorial/rule-service";
import { buildCheckContext, type FrenchSources } from "@/lib/french/context";
import type { CheckContext } from "@/lib/french/types";
import { useRepository } from "./useRepository";

/** Sources du correcteur, en direct : réglages, fiches, dictionnaire, état des règles. */
export function useFrenchSources(): FrenchSources | undefined {
  const repository = useRepository();
  return useLiveQuery(async () => {
    if (!repository) return undefined;
    const [settings, fighters, events, sessions, entries, ruleStates, editorialRules] =
      await Promise.all([
        repository.getSettings(),
        repository.fighters.list(),
        repository.events.list(),
        repository.liveSessions.list(),
        repository.frenchDictionary.list(),
        repository.frenchRules.list(),
        loadRules(repository),
      ]);
    return { settings, fighters, events, sessions, entries, ruleStates, editorialRules };
  }, [repository]);
}

/** Contexte du correcteur (dictionnaire maison compris). `undefined` : chargement. */
export function useFrenchContext(): CheckContext | undefined {
  const sources = useFrenchSources();
  return useMemo(() => (sources ? buildCheckContext(sources) : undefined), [sources]);
}
