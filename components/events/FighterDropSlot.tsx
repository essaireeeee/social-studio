"use client";

import { useState } from "react";
import { fighterName } from "@/lib/studio/fighter-search";
import { cn } from "@/lib/utils";
import type { Fighter } from "@/types/domain";

export const FIGHTER_MIME = "application/x-hexagone-fighter";

interface FighterDropSlotProps {
  label: string;
  value: string;
  fighters: readonly Fighter[];
  onChange: (fighterId: string) => void;
}

/** Coin d'un combat : zone de dépôt d'un combattant, et liste déroulante pour le clavier. */
export function FighterDropSlot({ label, value, fighters, onChange }: FighterDropSlotProps) {
  const [over, setOver] = useState(false);
  return (
    <div
      data-testid={`slot-${label}`}
      onDragOver={(e) => {
        if (!e.dataTransfer.types.includes(FIGHTER_MIME)) return;
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        const id = e.dataTransfer.getData(FIGHTER_MIME);
        setOver(false);
        if (!id) return;
        e.preventDefault();
        onChange(id);
      }}
      className={cn(
        "rounded-md border border-dashed p-1 transition-colors",
        over ? "border-accent bg-accent/10" : value ? "border-transparent" : "border-border",
      )}
    >
      <select
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-8 w-full rounded-md border border-input bg-background px-2 text-13 text-foreground"
      >
        <option value="">Déposer ou choisir…</option>
        {fighters.map((f) => (
          <option key={f.id} value={f.id}>
            {fighterName(f)}
          </option>
        ))}
      </select>
    </div>
  );
}
