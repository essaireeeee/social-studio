"use client";

import {
  BadgeCheck,
  CalendarDays,
  Dna,
  Hash,
  History,
  Library,
  Megaphone,
  Settings,
  SpellCheck,
  Users,
  type LucideIcon,
} from "lucide-react";
import { ScreenTitle } from "@/components/layout/ScreenTitle";
import { Cell, GroupedSection } from "@/components/ui/grouped-list";
import type { IconColor } from "@/lib/design/icon-colors";
import { COMING_SOON, MORE_ITEMS } from "@/lib/shell/navigation";

const LOOK: Record<string, { icon: LucideIcon; color: IconColor }> = {
  library: { icon: Library, color: "blue" },
  fighters: { icon: Users, color: "live" },
  events: { icon: CalendarDays, color: "orange" },
  hashtags: { icon: Hash, color: "teal" },
  editorial: { icon: Dna, color: "purple" },
  french: { icon: SpellCheck, color: "indigo" },
  campaigns: { icon: Megaphone, color: "pink" },
  history: { icon: History, color: "gray" },
  validated: { icon: BadgeCheck, color: "green" },
  settings: { icon: Settings, color: "gray" },
};

const GROUPS: { id: string; header: string; ids: string[] }[] = [
  { id: "contenus", header: "Contenus", ids: ["library", "fighters", "events", "hashtags"] },
  { id: "outils", header: "Outils éditoriaux", ids: ["editorial", "french", "campaigns"] },
  { id: "suivi", header: "Suivi", ids: ["history", "validated"] },
  { id: "reglages", header: "Réglages", ids: ["settings"] },
];

/** Onglet Plus (section 5.8) : tous les autres écrans, en cellules groupées. */
export function MorePage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-4 sm:px-6">
      <ScreenTitle>Plus</ScreenTitle>
      {GROUPS.map((group) => (
        <GroupedSection key={group.id} id={group.id} header={group.header}>
          {group.ids.map((id) => {
            const item = MORE_ITEMS.find((i) => i.id === id)!;
            const look = LOOK[id]!;
            return (
              <Cell
                key={id}
                title={item.label}
                icon={look.icon}
                iconColor={look.color}
                href={item.available ? item.href : undefined}
                disabled={!item.available}
                disabledNote={item.available ? undefined : COMING_SOON}
              />
            );
          })}
        </GroupedSection>
      ))}
    </div>
  );
}
