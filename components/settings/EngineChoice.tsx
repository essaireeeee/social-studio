"use client";

import { Check } from "lucide-react";
import { KEY_SOURCE_LABELS, type ProviderView } from "@/lib/ai/indicator";
import type { ProviderId } from "@/lib/ai/types";
import { cn } from "@/lib/utils";
import type { Engine } from "@/types/domain";

const OPTIONS: { id: Engine; label: string; description: string }[] = [
  {
    id: "native",
    label: "Natif",
    description:
      "Composition à partir des modèles et des références de la bibliothèque. Sans clé, sans réseau.",
  },
  {
    id: "anthropic",
    label: "Claude (Anthropic)",
    description: "Rédaction par le modèle Claude, via le serveur local.",
  },
  {
    id: "openai",
    label: "OpenAI",
    description: "Rédaction par un modèle OpenAI, via le serveur local.",
  },
];

interface EngineChoiceProps {
  value: Engine;
  views: Partial<Record<ProviderId, ProviderView>>;
  disabled?: boolean;
  onChange: (engine: Engine) => void;
}

/** Choix du moteur de génération (section 11.5). Le natif reste toujours disponible. */
export function EngineChoice({ value, views, disabled, onChange }: EngineChoiceProps) {
  const selectedView = value === "native" ? undefined : views[value];
  return (
    <section className="flex flex-col gap-3" aria-labelledby="engine-choice-title">
      <h2 id="engine-choice-title" className="text-sm font-semibold">
        Moteur de génération
      </h2>
      <div
        role="radiogroup"
        aria-labelledby="engine-choice-title"
        className="grid gap-2 sm:grid-cols-3"
      >
        {OPTIONS.map((option) => {
          const checked = option.id === value;
          const view = option.id === "native" ? undefined : views[option.id];
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={checked}
              disabled={disabled}
              onClick={() => onChange(option.id)}
              className={cn(
                "flex flex-col items-start gap-1.5 rounded-lg border bg-card p-3 text-left accent-transition hover:bg-fill disabled:cursor-not-allowed disabled:opacity-50",
                checked ? "border-accent" : "border-border",
              )}
            >
              <span className="flex w-full items-center justify-between gap-2 text-13 font-medium">
                {option.label}
                {checked ? <Check className="size-4 text-accent-text" aria-hidden="true" /> : null}
              </span>
              <span className="text-xs text-muted-foreground">{option.description}</span>
              {view ? (
                <span
                  className={cn(
                    "text-xs",
                    view.configured ? "text-success" : "text-muted-foreground",
                  )}
                >
                  {view.configured ? KEY_SOURCE_LABELS[view.keySource] : "Non configuré"}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
      {selectedView && !selectedView.configured ? (
        <p className="text-xs text-warning" role="status">
          Ce fournisseur n&apos;est pas configuré : chaque génération basculera sur le moteur natif,
          avec un message.
        </p>
      ) : null}
    </section>
  );
}
