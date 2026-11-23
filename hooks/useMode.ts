"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useCallback, useEffect } from "react";
import { MODE_STORAGE_KEY, writeStored } from "@/lib/shell/shortcuts";
import { useStudioStore } from "@/stores/studio.store";
import type { Mode } from "@/types/domain";
import { useRepository } from "./useRepository";

function applyToDocument(mode: Mode): void {
  document.documentElement.dataset.mode = mode;
  writeStored(MODE_STORAGE_KEY, mode);
}

/** Mode actif et changement de mode : `data-mode`, réglages (`lastMode`), copie locale. */
export function useMode() {
  const mode = useStudioStore((state) => state.mode);
  const repository = useRepository();

  const setMode = useCallback(
    async (next: Mode) => {
      useStudioStore.getState().setMode(next);
      applyToDocument(next);
      if (!repository) return;
      const settings = await repository.getSettings();
      if (settings.lastMode !== next)
        await repository.saveSettings({ ...settings, lastMode: next });
    },
    [repository],
  );

  return { mode, setMode };
}

/**
 * Synchronise le mode au démarrage : d'abord la copie locale (déjà appliquée avant
 * l'affichage par le script du layout), puis les réglages en base, qui font foi
 * (restauration, import, autre onglet).
 */
export function useModeSync(): void {
  const repository = useRepository();
  const stored = useLiveQuery(
    async () => (repository ? (await repository.getSettings()).lastMode : undefined),
    [repository],
  );

  useEffect(() => {
    const fromDocument = document.documentElement.dataset.mode;
    if (fromDocument === "live" || fromDocument === "daily") {
      useStudioStore.getState().setMode(fromDocument);
    }
  }, []);

  useEffect(() => {
    if (!stored) return;
    useStudioStore.getState().setMode(stored);
    applyToDocument(stored);
  }, [stored]);
}
