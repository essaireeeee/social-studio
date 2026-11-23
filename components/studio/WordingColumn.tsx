"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Share2 } from "lucide-react";
import { ReferencesPanel } from "@/components/editor/ReferencesPanel";
import { DeclinePanel } from "@/components/editor/DeclinePanel";
import { VariantCard } from "@/components/editor/VariantCard";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useRepository } from "@/hooks/useRepository";
import { useStudioActions } from "@/hooks/useStudioActions";
import type { StudioData } from "@/hooks/useStudioData";
import { styleParameters } from "@/lib/editorial/profile-service";
import { useStudioSession } from "@/stores/studio-session.store";
import { useStudioStore } from "@/stores/studio.store";
import type { Generation } from "@/types/domain";

function EmptyState() {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-5 text-13 text-muted-foreground">
      <p className="font-medium text-foreground">Aucune proposition pour l&apos;instant.</p>
      <ol className="list-decimal space-y-1 pl-5">
        <li>Choisissez une catégorie.</li>
        <li>Remplissez les champs marqués d&apos;un point.</li>
        <li>Générez : trois variantes apparaissent ici, la Signature en premier.</li>
      </ol>
      <ul className="flex flex-col gap-1.5 text-xs">
        <li>
          <Kbd>Ctrl ↵</Kbd> générer · <Kbd>Alt 1</Kbd> <Kbd>Alt 2</Kbd> <Kbd>Alt 3</Kbd> choisir la
          variante de l&apos;aperçu
        </li>
        <li>
          <Kbd>Ctrl ⇧ C</Kbd> copier la variante affichée · <Kbd>1</Kbd> à <Kbd>=</Kbd> catégories
          LIVE · <Kbd>?</Kbd> tous les raccourcis
        </li>
      </ul>
    </div>
  );
}

function Skeletons() {
  return (
    <div className="flex flex-col gap-3" aria-busy="true" aria-label="Génération en cours">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-56 animate-pulse rounded-lg border border-border bg-card" />
      ))}
    </div>
  );
}

/** Colonne 2 : les trois variantes et leurs outils (section 13.4). */
export function WordingColumn({ data }: { data: StudioData }) {
  const repository = useRepository();
  const mode = useStudioStore((s) => s.mode);
  const generationId = useStudioStore((s) => s.generationIds[s.mode]);
  const generating = useStudioSession((s) => s.generating);
  const notice = useStudioSession((s) => s.notice);
  const signatureIssue = useStudioSession((s) => s.signatureIssue);
  const references = useStudioSession((s) => s.references);
  const excludedIds = useStudioSession((s) => s.excludedIds);
  const declination = useStudioSession((s) => s.declination);
  const { generate, refine, decline } = useStudioActions();

  const generation = useLiveQuery<Generation | null | undefined>(
    async () =>
      repository && generationId
        ? ((await repository.generations.get(generationId)) ?? null)
        : null,
    [repository, generationId],
  );

  const params = styleParameters(data.profile, mode);
  const selected = generation?.variants.find((v) => v.selected) ?? generation?.variants[0];
  const busy = useStudioSession((s) => (selected ? s.busy[selected.id] : undefined));
  const declineWarnings =
    declination && declination.variantId === selected?.id
      ? Object.fromEntries(
          Object.entries(declination.versions).map(([p, r]) => [p, r!.factWarnings.length]),
        )
      : undefined;

  return (
    <div className="flex flex-col gap-4 p-4">
      {notice ? (
        <p
          role="status"
          className="rounded-md border border-warning/40 bg-warning/10 px-3 py-2 text-13 text-warning"
        >
          {notice}
        </p>
      ) : null}
      {signatureIssue && signatureIssue.missing.length > 0 ? (
        <p className="text-xs text-warning">
          Signature incomplète : {signatureIssue.missing.join(", ")}{" "}
          {signatureIssue.missing.length > 1 ? "manquantes" : "manquante"}. Elle n&apos;a pas été
          ajoutée.
        </p>
      ) : null}

      {generating ? (
        <Skeletons />
      ) : !generation || generation.brief.mode !== mode ? (
        <EmptyState />
      ) : (
        <>
          {generation.variants.map((variant, index) => (
            <VariantCard
              key={variant.id}
              generation={generation}
              variant={variant}
              index={index}
              engine={data.settings.aiProvider}
              lint={{
                rules: data.rules,
                categoryId: generation.brief.categoryId,
                fields: generation.brief.fields,
                platform: generation.brief.platform,
                frenchSpacing: data.settings.frenchSpacing,
                emojiThreshold: params.emojiThreshold,
              }}
              onRefine={(action, instruction) =>
                void refine(generation.id, variant.id, action, instruction)
              }
            />
          ))}
          {selected ? (
            <Button
              variant="secondary"
              className="self-start"
              loading={busy === "decline"}
              disabled={Boolean(busy)}
              onClick={() => void decline(generation.id, selected.id)}
            >
              <Share2 aria-hidden="true" />
              DÉCLINER SUR LES AUTRES RÉSEAUX
            </Button>
          ) : null}
          <DeclinePanel
            key={generation.updatedAt}
            generation={generation}
            warnings={declineWarnings}
          />
        </>
      )}

      {references.length > 0 ? (
        <ReferencesPanel
          mode={mode}
          references={references}
          excludedIds={excludedIds}
          onToggleExclude={(id) => useStudioSession.getState().toggleExcluded(id)}
          onRegenerate={() => void generate({ withExclusions: true })}
          regenerating={generating}
        />
      ) : null}
    </div>
  );
}
