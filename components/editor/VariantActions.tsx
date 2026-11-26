"use client";

import { Check, Copy, Ellipsis, Library, Star } from "lucide-react";
import { DropdownMenu } from "radix-ui";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRepository } from "@/hooks/useRepository";
import { keepHook, publish, reopen, validate } from "@/lib/studio/actions";
import { toast } from "@/stores/toast.store";
import type { Generation, Variant } from "@/types/domain";
import { LibraryDialog } from "./LibraryDialog";
import { PublishDialog } from "./PublishDialog";

interface VariantActionsProps {
  generation: Generation;
  variant: Variant;
  text: string;
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast("Copié", "success");
  } catch {
    toast("Copie impossible : autorisez l'accès au presse-papiers.", "danger");
  }
}

/** Copier, garder l'accroche, bibliothèque, valider, publier (section 13.4). */
export function VariantActions({ generation, variant, text }: VariantActionsProps) {
  const repository = useRepository();
  const [dialog, setDialog] = useState<"library" | "publish" | null>(null);
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

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Button size="sm" variant="secondary" onClick={() => void copyText(text)}>
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
        <Button
          size="sm"
          onClick={() =>
            repository &&
            void run(() => validate(repository, generation.id, variant.id), "Variante validée")
          }
        >
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
