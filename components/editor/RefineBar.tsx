"use client";

import { LoaderCircle } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { refineAvailability } from "@/lib/generation/orchestrator";
import { cn } from "@/lib/utils";
import type { Engine, RefineAction } from "@/types/domain";

const ACTIONS: { action: RefineAction; emoji: string; label: string }[] = [
  { action: "shorten", emoji: "⚡", label: "Raccourcir" },
  { action: "punchier", emoji: "🔥", label: "Plus percutant" },
  { action: "institutional", emoji: "📰", label: "Plus institutionnel" },
  { action: "new_hook", emoji: "🎯", label: "Nouvelle accroche" },
  { action: "toggle_emojis", emoji: "😊", label: "Emojis +/-" },
  { action: "rephrase", emoji: "✍️", label: "Reformuler" },
  { action: "regenerate", emoji: "🔄", label: "Régénérer" },
];

interface RefineBarProps {
  engine: Engine;
  busy?: RefineAction | "decline";
  disabled?: boolean;
  onRefine: (action: RefineAction, instruction?: string) => void;
}

/** Retouches d'une variante (section 13.4) : chaque action ajoute une révision. */
export function RefineBar({ engine, busy, disabled, onRefine }: RefineBarProps) {
  const [instruction, setInstruction] = useState("");
  const customBlocked = refineAvailability(engine, "custom");
  const locked = Boolean(busy) || disabled;

  const apply = () => {
    if (!instruction.trim() || customBlocked || locked) return;
    onRefine("custom", instruction.trim());
    setInstruction("");
  };

  return (
    <div className="flex flex-col gap-2">
      <div role="group" aria-label="Retouches" className="flex flex-wrap gap-1">
        {ACTIONS.map(({ action, emoji, label }) => (
          <button
            key={action}
            type="button"
            disabled={locked}
            aria-busy={busy === action || undefined}
            onClick={() => onRefine(action)}
            className={cn(
              "flex h-7 cursor-pointer items-center gap-1 rounded-md border border-border bg-elevated px-2 text-xs accent-transition hover:bg-subtle active:bg-subtle/70 disabled:cursor-not-allowed disabled:opacity-50",
              busy === action && "border-accent",
            )}
          >
            {busy === action ? (
              <LoaderCircle className="size-3 animate-spin" aria-hidden="true" />
            ) : (
              <span aria-hidden="true">{emoji}</span>
            )}
            {label}
          </button>
        ))}
      </div>
      <Tooltip content={customBlocked ?? ""} enabled={Boolean(customBlocked)} side="top">
        <div className="flex gap-1.5">
          <Input
            aria-label="Une consigne particulière ?"
            placeholder="Une consigne particulière ?"
            disabled={Boolean(customBlocked) || locked}
            value={instruction}
            onChange={(event) => setInstruction(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !(event.metaKey || event.ctrlKey)) {
                event.preventDefault();
                apply();
              }
            }}
          />
          <Button
            variant="secondary"
            disabled={Boolean(customBlocked) || locked || !instruction.trim()}
            loading={busy === "custom"}
            onClick={apply}
          >
            Appliquer
          </Button>
        </div>
      </Tooltip>
      {customBlocked ? <p className="text-xs text-muted-foreground">{customBlocked}.</p> : null}
    </div>
  );
}
