"use client";

import { ArrowDown, ArrowUp } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Monter / descendre un élément d'une liste ordonnée. */
export function OrderButtons({
  name,
  index,
  count,
  onMove,
}: {
  name: string;
  index: number;
  count: number;
  onMove: (to: number) => void;
}) {
  return (
    <span className="flex gap-0.5">
      <Button
        size="icon"
        variant="ghost"
        aria-label={`Monter ${name}`}
        disabled={index === 0}
        onClick={() => onMove(index - 1)}
      >
        <ArrowUp aria-hidden="true" />
      </Button>
      <Button
        size="icon"
        variant="ghost"
        aria-label={`Descendre ${name}`}
        disabled={index === count - 1}
        onClick={() => onMove(index + 1)}
      >
        <ArrowDown aria-hidden="true" />
      </Button>
    </span>
  );
}
