"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useRepository } from "@/hooks/useRepository";
import type { Settings } from "@/types/domain";

type FrenchPrefs = Settings["french"];
export type FrenchPrefsPatch = Partial<Omit<FrenchPrefs, "layers">> & {
  layers?: Partial<FrenchPrefs["layers"]>;
};

/** Réglages de l'Atelier, enregistrés dès qu'ils changent (comme Réglages iOS). */
export function useFrenchPrefs() {
  const repository = useRepository();
  const settings = useLiveQuery(() => repository?.getSettings(), [repository]);
  const save = async (patch: FrenchPrefsPatch) => {
    if (!repository) return;
    // Relu juste avant l'écriture : le reste des réglages a pu changer ailleurs.
    const current = await repository.getSettings();
    await repository.saveSettings({
      ...current,
      french: {
        ...current.french,
        ...patch,
        layers: { ...current.french.layers, ...patch.layers },
      },
    });
  };
  return { settings, prefs: settings?.french, save };
}
