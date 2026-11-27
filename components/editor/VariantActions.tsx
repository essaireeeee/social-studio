"use client";

import { Check, Copy, Ellipsis, Library, Star } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";
import { ActionSheet } from "@/components/ui/action-sheet";
import { Button } from "@/components/ui/button";
import { useFrenchSources } from "@/hooks/useFrenchContext";
import { useRepository } from "@/hooks/useRepository";
import { plural } from "@/lib/format";
import { buildCheckContext } from "@/lib/french/context";
import { checkLocal, fixAll, forCopy } from "@/lib/french/engine";
import { logIssues } from "@/lib/french/journal";
import type { FrenchIssue } from "@/lib/french/types";
import { keepHook, publish, reopen, saveEdit, validate } from "@/lib/studio/actions";
import { useStudioSession } from "@/stores/studio-session.store";
import { toast } from "@/stores/toast.store";
import type { Generation, Variant } from "@/types/domain";
import { LibraryDialog } from "./LibraryDialog";
import { PublishDialog } from "./PublishDialog";
import { authorOf } from "./VariantEditor";

interface VariantActionsProps {
  generation: Generation;
  variant: Variant;
  text: string;
}

/**
 * Copie dans le presse-papiers. « Compatibilité réseaux sociaux » (défaut) : l'espace fine
 * U+202F devient une insécable U+00A0, mieux affichée par les applications.
 */
export async function copyText(text: string, socialCompat = true): Promise<void> {
  try {
    await navigator.clipboard.writeText(forCopy(text, socialCompat));
    toast("Copié", "success");
  } catch {
    toast("Copie impossible : autorisez l'accès au presse-papiers.", "danger");
  }
}

/** Copier, garder l'accroche, bibliothèque, valider, publier (section 13.4). */
export function VariantActions({ generation, variant, text }: VariantActionsProps) {
  const repository = useRepository();
  const sources = useFrenchSources();
  const [dialog, setDialog] = useState<"library" | "publish" | null>(null);
  const [unfixed, setUnfixed] = useState<FrenchIssue[] | null>(null);
  const revision = variant.revisions.at(-1)!;
  const author = text === revision.text ? authorOf(revision) : "cm";
  const socialCompat = sources?.settings.french.socialCompat ?? true;
  const final = generation.variants.find((v) => v.selected)?.id === variant.id;
  const validated =
    final && (generation.status === "validated" || generation.status === "published");

  const run = async (fn: () => Promise<unknown>, success: string) => {
    try {
      await fn();
      toast(success, "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Action impossible.", "danger");
    }
  };

  /** Valider avec une faute restante ouvre une ActionSheet (section 6.4). */
  const requestValidation = () => {
    if (!repository) return;
    const errors = sources
      ? checkLocal(text, {
          ...buildCheckContext(sources),
          categoryId: generation.brief.categoryId,
          mode: generation.brief.mode,
        }).filter((i) => i.severity === "error" && i.confidence === "high")
      : [];
    if (errors.length > 0) return setUnfixed(errors);
    void run(() => validate(repository, generation.id, variant.id), "Variante validée");
  };

  const correctThenReview = async () => {
    if (!repository || !unfixed) return;
    const fixed = fixAll(text, unfixed);
    if (fixed !== text) {
      await saveEdit(repository, generation.id, variant.id, {
        text: fixed,
        factWarnings: [],
        now: new Date(),
      });
      useStudioSession.getState().setLiveText(variant.id, undefined);
      await logIssues(repository, unfixed, "corrected", author);
      toast("Fautes corrigées : relisez puis validez.", "success");
    } else {
      document.getElementById(`editor-${variant.id}`)?.focus();
    }
  };

  const validateAnyway = async () => {
    if (!repository || !unfixed) return;
    await logIssues(repository, unfixed, "validated_anyway", author);
    await run(() => validate(repository, generation.id, variant.id), "Variante validée");
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button size="sm" variant="secondary" onClick={() => void copyText(text, socialCompat)}>
        <Copy aria-hidden="true" />
        Copier
      </Button>
      <Button
        size="sm"
        variant="secondary"
        onClick={() =>
          repository && void run(() => keepHook(repository, generation, text), "Accroche gardée")
        }
      >
        <Star aria-hidden="true" />
        Garder l&apos;accroche
      </Button>
      <Button size="sm" variant="secondary" onClick={() => setDialog("library")}>
        <Library aria-hidden="true" />
        {generation.savedToLibraryId ? "Enregistrer à nouveau" : "Enregistrer dans la bibliothèque"}
      </Button>
      {validated ? (
        <span className="flex h-7 items-center gap-1 rounded-md border border-success/40 bg-success/10 px-2 text-xs font-medium text-success">
          <Check className="size-3.5" aria-hidden="true" />
          {generation.status === "published" ? "Publiée" : "Validée"}
        </span>
      ) : (
        <Button size="sm" onClick={requestValidation}>
          <Check aria-hidden="true" />
          Valider
        </Button>
      )}
      <DropdownMenu.Root>
        <DropdownMenu.Trigger asChild>
          <Button size="sm" variant="ghost" aria-label="Autres actions">
            <Ellipsis aria-hidden="true" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Portal>
          <DropdownMenu.Content
            align="end"
            className="z-50 min-w-48 rounded-md border border-border bg-popover p-1 text-13 shadow-float"
          >
            {generation.status !== "published" ? (
              <DropdownMenu.Item
                onSelect={() => setDialog("publish")}
                className="cursor-pointer rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-fill"
              >
                Marquer comme publié…
              </DropdownMenu.Item>
            ) : null}
            {generation.status === "validated" && final ? (
              <DropdownMenu.Item
                onSelect={() =>
                  repository &&
                  void run(() => reopen(repository, generation.id), "Validation retirée")
                }
                className="cursor-pointer rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-fill"
              >
                Retirer la validation
              </DropdownMenu.Item>
            ) : null}
            {generation.status === "published" ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">
                Publiée le {generation.publishedAt}
              </p>
            ) : null}
          </DropdownMenu.Content>
        </DropdownMenu.Portal>
      </DropdownMenu.Root>

      <ActionSheet
        open={unfixed !== null}
        onClose={() => setUnfixed(null)}
        title={plural(unfixed?.length ?? 0, "faute non corrigée", "fautes non corrigées")}
        description={unfixed?.map((i) => `« ${i.excerpt.trim()} » : ${i.message}`).join(" · ")}
        actions={[
          { label: "Corriger", onSelect: () => void correctThenReview() },
          { label: "Valider quand même", onSelect: () => void validateAnyway() },
        ]}
      />
      {dialog === "library" ? (
        <LibraryDialog generation={generation} text={text} onClose={() => setDialog(null)} />
      ) : null}
      {dialog === "publish" ? (
        <PublishDialog
          today={new Date().toISOString().slice(0, 10)}
          onClose={() => setDialog(null)}
          onConfirm={async (input) => {
            if (repository)
              await run(
                () => publish(repository, generation.id, variant.id, input),
                "Marquée comme publiée",
              );
          }}
        />
      ) : null}
    </div>
  );
}
