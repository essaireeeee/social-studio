"use client";

import { Database, SlidersHorizontal, Sparkles, UserCog, type LucideIcon } from "lucide-react";
import { ScreenTitle } from "@/components/layout/ScreenTitle";
import { Cell, GroupedSection } from "@/components/ui/grouped-list";
import { useAiOverview } from "@/hooks/useAiOverview";
import { useActiveUser } from "@/hooks/useRepository";
import type { IconColor } from "@/lib/design/icon-colors";
import { SETTINGS_ITEMS } from "@/lib/shell/navigation";

const LOOK: Record<string, { icon: LucideIcon; color: IconColor; subtitle: string }> = {
  "settings-ai": { icon: Sparkles, color: "purple", subtitle: "Moteur natif, Claude ou OpenAI" },
  "settings-preferences": {
    icon: SlidersHorizontal,
    color: "gray",
    subtitle: "Apparence, compte, aperçus, installation",
  },
  "settings-data": { icon: Database, color: "blue", subtitle: "Exports, import, sauvegardes" },
  "settings-users": { icon: UserCog, color: "orange", subtitle: "Profils CM et administrateur" },
};

/** Paramètres en listes groupées, comme Réglages iOS (section 5.8). */
export function SettingsIndex() {
  const { indicator } = useAiOverview();
  const user = useActiveUser();
  const values: Record<string, string | undefined> = {
    "settings-ai": indicator.text,
    "settings-users": user?.name,
  };
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-4 sm:px-6">
      <ScreenTitle>Paramètres</ScreenTitle>
      <GroupedSection id="parametres" header="Application">
        {SETTINGS_ITEMS.map((item) => {
          const look = LOOK[item.id]!;
          return (
            <Cell
              key={item.id}
              title={item.label}
              subtitle={look.subtitle}
              value={values[item.id]}
              icon={look.icon}
              iconColor={look.color}
              href={item.href}
            />
          );
        })}
      </GroupedSection>
    </div>
  );
}
