"use client";

import { Badge } from "@/components/ui/badge";
import { Kbd } from "@/components/ui/kbd";
import { useRepository } from "@/hooks/useRepository";
import type { LintContext } from "@/lib/editorial/linter";
import { showInPreview, restore } from "@/lib/studio/actions";
import { CONTENT_STATUS_LABELS, ORIGIN_LABELS, contentStatus } from "@/lib/studio/revisions";
import { cn } from "@/lib/utils";
import { useStudioSession } from "@/stores/studio-session.store";
import { useStudioStore } from "@/stores/studio.store";
import type { Engine, Generation, RefineAction, Variant, VariantKind } from "@/types/domain";
import { CharCounter } from "./CharCounter";
import { RefineBar } from "./RefineBar";
import { RevisionTimeline } from "./RevisionTimeline";
import { VariantActions } from "./VariantActions";
import { VariantEditor } from "./VariantEditor";

export const VARIANT_LABELS: Record<VariantKind, string> = {
  signature: "Signature HEXAGONE",
  punchy: "Punchy",
  storytelling: "Storytelling & engagement",
};

const STATUS_TONE = {
  generated: "neutral",
  edited: "warning",
  validated: "success",
  published: "success",
} as const;

interface VariantCardProps {
  generation: Generation;
  variant: Variant;
  index: number;
  engine: Engine;
  lint: LintContext;
  onRefine: (action: RefineAction, instruction?: string) => void;
}

/** Une variante (section 13.4) : en-tête, éditeur, retouches, versions, actions. */
export function VariantCard({
  generation,
  variant,
  index,
  engine,
  lint,
  onRefine,
}: VariantCardProps) {
  const repository = useRepository();
  const revision = variant.revisions.at(-1)!;
  const live = useStudioSession((s) => s.liveText[variant.id]);
  const busy = useStudioSession((s) => s.busy[variant.id]);
  const text = live ?? revision.text;
  const status = contentStatus(generation, variant);
  const locked = generation.status === "validated" || generation.status === "published";
  const label = VARIANT_LABELS[variant.kind];

  const preview = () => {
    if (repository) void showInPreview(repository, generation.id, variant.id);
  };

  return (
    <article
      aria-label={`Variante ${index + 1} : ${label}`}
      className={cn(
        "flex flex-col gap-3 rounded-lg border bg-card p-3 sm:p-4",
        variant.selected ? "border-accent" : "border-border",
      )}
    >
      <header className="flex flex-wrap items-center gap-2">
        <h3 className="text-13 font-semibold">{label}</h3>
        {variant.kind === "signature" ? (
          <Badge variant={generation.brief.mode}>Recommandée</Badge>
        ) : null}
        <Badge>{ORIGIN_LABELS[revision.origin]}</Badge>
        <Badge variant={STATUS_TONE[status]}>{CONTENT_STATUS_LABELS[status]}</Badge>
        <span className="ml-auto flex items-center gap-3">
          <CharCounter text={text} platform={generation.brief.platform} />
          <label className="flex cursor-pointer items-center gap-1.5 text-xs text-muted-foreground">
            <input
              type="radio"
              name={`preview-${generation.id}`}
              checked={variant.selected}
              disabled={locked}
              onChange={preview}
              className="size-3.5 accent-[var(--accent)]"
            />
            Aperçu
            <Kbd className="hidden xl:inline-flex">Alt {index + 1}</Kbd>
          </label>
        </span>
      </header>

      <VariantEditor
        generationId={generation.id}
        variantId={variant.id}
        revision={revision}
        lint={lint}
        label={`Texte de la variante ${label}`}
      />

      <RefineBar engine={engine} busy={busy} disabled={locked} onRefine={onRefine} />

      <RevisionTimeline
        revisions={variant.revisions}
        disabled={locked || Boolean(busy)}
        onRestore={(revisionId) => {
          if (repository) void restore(repository, generation.id, variant.id, revisionId);
          useStudioSession.getState().setLiveText(variant.id, undefined);
        }}
      />

      <VariantActions generation={generation} variant={variant} text={text} />
      {variant.selected ? (
        <button
          type="button"
          className="self-start text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline lg:hidden"
          onClick={() => useStudioStore.getState().setMobileTab("preview")}
        >
          Voir l&apos;aperçu
        </button>
      ) : null}
    </article>
  );
}
