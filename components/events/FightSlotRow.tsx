"use client";

import { ArrowDown, ArrowUp, GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  POSITION_LABELS,
  type CardPosition,
  type FightSlot,
  type Side,
} from "@/lib/events/fight-card";
import type { Fighter } from "@/types/domain";
import { FighterDropSlot } from "./FighterDropSlot";

export const BOUT_MIME = "application/x-hexagone-bout";

interface FightSlotRowProps {
  fight: FightSlot;
  index: number;
  count: number;
  fighters: readonly Fighter[];
  error?: string;
  onPlace: (side: Side, fighterId: string) => void;
  onPatch: (patch: Partial<Omit<FightSlot, "key">>) => void;
  /** Déplace ce combat à la position `to`. */
  onMove: (to: number) => void;
  /** Un autre combat (glissé) est déposé ici. */
  onDropBout: (from: number) => void;
  onRemove: () => void;
}

/** Un combat de la fight card : deux coins, catégorie, position, titre, ordre. */
export function FightSlotRow(props: FightSlotRowProps) {
  const { fight, index, count } = props;
  const n = index + 1;
  return (
    <li
      aria-label={`Combat ${n}`}
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(BOUT_MIME)) e.preventDefault();
      }}
      onDrop={(e) => {
        const from = e.dataTransfer.getData(BOUT_MIME);
        if (from === "") return;
        e.preventDefault();
        props.onDropBout(Number(from));
      }}
      className="flex flex-col gap-2 rounded-md border border-border bg-background p-2"
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData(BOUT_MIME, String(index));
            e.dataTransfer.effectAllowed = "move";
          }}
          className="cursor-grab text-muted-foreground"
          title="Glisser pour réordonner"
        >
          <GripVertical className="size-4" aria-hidden="true" />
        </span>
        <span className="text-xs font-semibold">Combat {n}</span>
        <select
          aria-label={`Position du combat ${n}`}
          value={fight.position}
          onChange={(e) => props.onPatch({ position: e.target.value as CardPosition })}
          className="h-7 rounded-md border border-input bg-background px-1.5 text-xs text-foreground"
        >
          {(Object.keys(POSITION_LABELS) as CardPosition[]).map((p) => (
            <option key={p} value={p}>
              {POSITION_LABELS[p]}
            </option>
          ))}
        </select>
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={fight.title}
            onChange={(e) => props.onPatch({ title: e.target.checked })}
            className="size-3.5 accent-[var(--accent)]"
          />
          Titre
        </label>
        <span className="ml-auto flex gap-0.5">
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Monter le combat ${n}`}
            disabled={index === 0}
            onClick={() => props.onMove(index - 1)}
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Descendre le combat ${n}`}
            disabled={index === count - 1}
            onClick={() => props.onMove(index + 1)}
          >
            <ArrowDown aria-hidden="true" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label={`Retirer le combat ${n}`}
            onClick={props.onRemove}
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </span>
      </div>
      <div className="grid items-center gap-2 sm:grid-cols-[1fr_auto_1fr]">
        <FighterDropSlot
          label={`Combat ${n}, coin A`}
          value={fight.fighterAId}
          fighters={props.fighters}
          onChange={(id) => props.onPlace("A", id)}
        />
        <span className="text-center text-xs font-semibold text-muted-foreground">VS</span>
        <FighterDropSlot
          label={`Combat ${n}, coin B`}
          value={fight.fighterBId}
          fighters={props.fighters}
          onChange={(id) => props.onPlace("B", id)}
        />
      </div>
      <Input
        aria-label={`Catégorie de poids du combat ${n}`}
        placeholder="Catégorie de poids (facultatif)"
        value={fight.weightClass}
        onChange={(e) => props.onPatch({ weightClass: e.target.value })}
      />
      {props.error ? <p className="text-xs text-danger">{props.error}</p> : null}
    </li>
  );
}
