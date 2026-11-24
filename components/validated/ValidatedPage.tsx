"use client";

import { Sparkles } from "lucide-react";
import { useState } from "react";
import { GenerationStatusBadge } from "@/components/history/GenerationStatusBadge";
import { Button } from "@/components/ui/button";
import { useHistoryData } from "@/hooks/useHistoryData";
import { useRepository } from "@/hooks/useRepository";
import { getCategory } from "@/lib/categories/registry";
import { formatDateTime } from "@/lib/format";
import { finalTextOf, pendingReferences } from "@/lib/history/history";
import { MODE_LABELS } from "@/lib/shell/mode";
import { saveToLibrary } from "@/lib/studio/actions";
import { toast } from "@/stores/toast.store";
import type { Generation } from "@/types/domain";

/**
 * Apprentissage contrôlé (section 16.1) : les générations validées attendent ici. Rien
 * n'entre dans le corpus de style sans « Ajouter comme référence ».
 */
export function ValidatedPage() {
  const repository = useRepository();
  const data = useHistoryData();
  const [busy, setBusy] = useState<string | null>(null);
  const pending = pendingReferences(data?.generations ?? []);

  const add = async (generation: Generation) => {
    if (!repository) return;
    setBusy(generation.id);
    try {
      await saveToLibrary(repository, generation, {
        text: finalTextOf(generation),
        status: generation.status === "published" ? "published" : "validated",
        date: generation.publishedAt,
      });
      toast("Ajoutée comme référence de style", "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Ajout impossible.", "danger");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Publications validées</h1>
        <p className="max-w-2xl text-13 text-muted-foreground">
          Les textes validés ou publiés qui ne sont pas encore dans la bibliothèque. Rien
          n&apos;entre automatiquement dans le corpus de style : c&apos;est vous qui décidez.
        </p>
      </header>
      {!data ? (
        <div
          className="h-24 animate-pulse rounded-lg border border-border bg-card"
          aria-busy="true"
        />
      ) : pending.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-10 text-center text-13 text-muted-foreground">
          Aucune publication validée en attente.
        </p>
      ) : (
        <ul className="flex flex-col gap-3" aria-label="Publications en attente">
          {pending.map((g) => (
            <li
              key={g.id}
              className="flex flex-col gap-2 rounded-lg border border-border bg-card p-4"
            >
              <p className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <GenerationStatusBadge status={g.status} />
                <span>{MODE_LABELS[g.brief.mode]}</span>
                <span>· {getCategory(g.brief.categoryId)?.label}</span>
                <span>· {formatDateTime(g.updatedAt)}</span>
              </p>
              <p className="text-13 whitespace-pre-wrap">{finalTextOf(g)}</p>
              <Button
                size="sm"
                className="self-start"
                loading={busy === g.id}
                onClick={() => void add(g)}
              >
                <Sparkles aria-hidden="true" />
                Ajouter comme référence
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
