"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { normalizeText } from "@/lib/editorial/text-utils";
import {
  addFightWith,
  fightersOnCard,
  moveFight,
  newFight,
  placeFighter,
  removeFight,
  updateFight,
  type FightSlot,
} from "@/lib/events/fight-card";
import { fighterName } from "@/lib/studio/fighter-search";
import { cn } from "@/lib/utils";
import type { Fighter } from "@/types/domain";
import { FIGHTER_MIME } from "./FighterDropSlot";
import { FightSlotRow } from "./FightSlotRow";

interface FightCardBuilderProps {
  card: FightSlot[];
  fighters: readonly Fighter[];
  errors: Record<string, string>;
  onChange: (card: FightSlot[]) => void;
}

/**
 * Fight card (section 15.2) : les combattants se glissent depuis la liste vers un coin ou
 * vers « Nouveau combat ». Au clavier : listes déroulantes et boutons d'ordre.
 */
export function FightCardBuilder({ card, fighters, errors, onChange }: FightCardBuilderProps) {
  const [query, setQuery] = useState("");
  const [over, setOver] = useState(false);
  const placed = fightersOnCard(card);
  const needle = normalizeText(query);
  const pool = fighters
    .filter((f) => !placed.has(f.id))
    .filter((f) => !needle || normalizeText(fighterName(f)).includes(needle));

  return (
    <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
      <div className="flex flex-col gap-2">
        <Input
          type="search"
          aria-label="Filtrer les combattants disponibles"
          placeholder="Filtrer"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <ul
          aria-label="Combattants disponibles"
          className="flex max-h-72 flex-col gap-1 overflow-y-auto"
        >
          {pool.map((f) => (
            <li
              key={f.id}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(FIGHTER_MIME, f.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              className="cursor-grab rounded-md border border-border bg-elevated px-2 py-1.5 text-13"
            >
              {fighterName(f)}
              {f.weightClass ? (
                <span className="block text-xs text-muted-foreground">{f.weightClass}</span>
              ) : null}
            </li>
          ))}
          {pool.length === 0 ? (
            <li className="text-xs text-muted-foreground">
              {fighters.length === 0
                ? "Créez d'abord des fiches combattants."
                : "Tous sont placés."}
            </li>
          ) : null}
        </ul>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        {card.length > 0 ? (
          <ol className="flex flex-col gap-2" aria-label="Combats de la soirée">
            {card.map((fight, index) => (
              <FightSlotRow
                key={fight.key}
                fight={fight}
                index={index}
                count={card.length}
                fighters={fighters}
                error={errors[fight.key]}
                onPlace={(side, id) => onChange(placeFighter(card, fight.key, side, id))}
                onPatch={(patch) => onChange(updateFight(card, fight.key, patch))}
                onMove={(to) => onChange(moveFight(card, index, to))}
                onDropBout={(from) => onChange(moveFight(card, from, index))}
                onRemove={() => onChange(removeFight(card, fight.key))}
              />
            ))}
          </ol>
        ) : null}
        <div
          data-testid="new-fight-zone"
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
            onChange(addFightWith(card, id));
          }}
          className={cn(
            "flex flex-wrap items-center justify-between gap-2 rounded-md border border-dashed p-3 text-xs text-muted-foreground",
            over ? "border-accent bg-accent/10" : "border-border",
          )}
        >
          Déposez un combattant ici pour ouvrir un nouveau combat.
          <Button size="sm" variant="secondary" onClick={() => onChange([...card, newFight()])}>
            <Plus aria-hidden="true" />
            Ajouter un combat
          </Button>
        </div>
      </div>
    </div>
  );
}
