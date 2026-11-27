"use client";

import { LargeTitle } from "@/components/layout/ScreenTitle";
import { Skeleton } from "@/components/ui/skeleton";
import { HouseRulesGroup } from "../settings/HouseRulesGroup";
import { LayersGroup } from "../settings/LayersGroup";
import { useFrenchPrefs } from "../settings/useFrenchPrefs";

/** Réglages de l'Atelier Français (section 6.5). */
export function FrenchSettingsPage() {
  const { settings, save } = useFrenchPrefs();
  const onChange = (patch: Parameters<typeof save>[0]) => void save(patch);
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 pt-3 pb-10 sm:px-6">
      <header className="flex flex-col gap-1">
        <LargeTitle>Réglages</LargeTitle>
        <p className="text-subheadline text-muted-foreground">
          Enregistrés dès qu&apos;ils changent, et inclus dans les sauvegardes.
        </p>
      </header>
      {settings ? (
        <>
          <LayersGroup settings={settings} onChange={onChange} />
          <HouseRulesGroup prefs={settings.french} onChange={onChange} />
        </>
      ) : (
        <Skeleton className="h-96 rounded-xl" />
      )}
    </div>
  );
}
