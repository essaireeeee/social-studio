"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Liste à ordonner par boutons (ordre des variantes). */
export function OrderList({
  label,
  items,
  onMove,
}: {
  label: string;
  items: { id: string; label: string }[];
  onMove: (from: number, to: number) => void;
}) {
  return (
    <fieldset className="flex flex-col gap-1">
      <legend className="mb-1 text-xs text-muted-foreground">{label}</legend>
      <ol className="flex flex-col gap-1" aria-label={label}>
        {items.map((item, i) => (
          <li
            key={item.id}
            className="flex items-center gap-2 rounded-md border border-border bg-background px-2 py-1 text-13"
          >
            <span className="w-5 text-muted-foreground">{i + 1}.</span>
            <span className="flex-1">{item.label}</span>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Monter ${item.label}`}
              disabled={i === 0}
              onClick={() => onMove(i, i - 1)}
            >
              <ArrowUp aria-hidden="true" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              aria-label={`Descendre ${item.label}`}
              disabled={i === items.length - 1}
              onClick={() => onMove(i, i + 1)}
            >
              <ArrowDown aria-hidden="true" />
            </Button>
          </li>
        ))}
      </ol>
    </fieldset>
  );
}
