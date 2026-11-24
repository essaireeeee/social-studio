"use client";

import { useCallback, useEffect, useRef } from "react";
import type { LintFix } from "@/lib/editorial/linter";
import { RefineUnavailableError } from "@/lib/generation/native/refine";
import { declineVariant, generateForBrief, refineVariant } from "@/lib/generation/orchestrator";
import { stableStringify } from "@/lib/generation/random";
import { activeSession } from "@/lib/shell/live-session";
import { draftErrors, toBrief } from "@/lib/studio/draft";
import { useAiStore } from "@/stores/ai.store";
import { useStudioSession } from "@/stores/studio-session.store";
import { useStudioStore } from "@/stores/studio.store";
import { toast } from "@/stores/toast.store";
import type { Engine, RefineAction } from "@/types/domain";
import { useStudioContext } from "@/components/studio/StudioContext";
import { useRepository } from "./useRepository";

const message = (error: unknown) =>
  error instanceof Error ? error.message : "Erreur inattendue. Réessayez.";

/** Champ du brief à focaliser après une erreur de validation. */
export function focusField(key: string): void {
  const target =
    key === "category"
      ? document.querySelector<HTMLElement>("[data-category-pill]")
      : document.getElementById(`field-${key}`);
  target?.focus();
}

/** État du fournisseur pour l'indicateur du header, d'après la dernière réponse réelle. */
function reportHealth(engine: Engine, failed: boolean): void {
  if (engine === "native") return;
  useAiStore.getState().setHealth(engine, failed ? "error" : "ok");
}

/** Génération, retouches et déclinaison depuis le Studio. */
export function useStudioActions() {
  const repository = useRepository();
  const { retriever } = useStudioContext();
  // Dernières versions des actions, pour « Réessayer » depuis une notification d'erreur.
  const latest = useRef<{
    generate?: (options?: { withExclusions?: boolean }) => Promise<void>;
    refine?: (g: string, v: string, a: RefineAction, i?: string) => Promise<void>;
    decline?: (g: string, v: string) => Promise<void>;
  }>({});
  const retry = (run: () => void) => ({ label: "Réessayer", onClick: run });

  const generate = useCallback(
    async (options: { withExclusions?: boolean } = {}) => {
      const session = useStudioSession.getState();
      if (!repository || !retriever || session.generating) return;
      const { mode, drafts } = useStudioStore.getState();
      const draft = drafts[mode];
      const errors = draftErrors(draft, mode);
      session.patch({ errors });
      if (Object.keys(errors).length > 0) {
        focusField(Object.keys(errors)[0]!);
        return;
      }
      session.patch({ generating: true, notice: undefined, declination: undefined });
      try {
        await retriever.ready;
        const [groups, signatures, live, settings] = await Promise.all([
          repository.hashtagGroups.list(),
          repository.signatures.list(),
          activeSession(repository),
          repository.getSettings(),
        ]);
        const brief = toBrief(draft, mode, { groups, signatures, liveSessionId: live?.id })!;
        const key = stableStringify(brief);
        const count = useStudioSession.getState().counts[key] ?? 0;
        const outcome = await generateForBrief(repository, retriever.retriever, brief, {
          regenerationCount: count,
          excludeIds: options.withExclusions ? useStudioSession.getState().excludedIds : undefined,
        });
        const fixes: Record<string, LintFix[]> = {};
        for (const variant of outcome.generation.variants) {
          const view = outcome.variants.find((v) => v.kind === variant.kind);
          if (view) fixes[variant.revisions[0]!.id] = view.fixes;
        }
        useStudioSession.getState().addFixes(fixes);
        useStudioSession.getState().patch({
          counts: { ...useStudioSession.getState().counts, [key]: count + 1 },
          references: outcome.references,
          excludedIds: options.withExclusions ? useStudioSession.getState().excludedIds : [],
          signatureIssue: outcome.signatureIssue,
          notice: outcome.notice,
        });
        reportHealth(settings.aiProvider, Boolean(outcome.notice));
        const store = useStudioStore.getState();
        store.setGeneration(outcome.generation.id);
        store.setMobileTab("results");
      } catch (error) {
        toast(
          message(error),
          "danger",
          retry(() => void latest.current.generate?.(options)),
        );
      } finally {
        useStudioSession.getState().patch({ generating: false });
      }
    },
    [repository, retriever],
  );

  const refine = useCallback(
    async (generationId: string, variantId: string, action: RefineAction, instruction?: string) => {
      if (!repository || !retriever) return;
      const session = useStudioSession.getState();
      if (session.busy[variantId]) return;
      session.setBusy(variantId, action);
      try {
        await retriever.ready;
        const settings = await repository.getSettings();
        const outcome = await refineVariant(
          repository,
          retriever.retriever,
          generationId,
          variantId,
          action,
          { instruction },
        );
        useStudioSession.getState().addFixes({ [outcome.revision.id]: outcome.result.fixes });
        if (outcome.notice) useStudioSession.getState().patch({ notice: outcome.notice });
        reportHealth(settings.aiProvider, Boolean(outcome.notice));
        if (useStudioStore.getState().mobileTab !== "results") {
          useStudioStore.getState().setResultsBadge(true);
        }
      } catch (error) {
        if (error instanceof RefineUnavailableError) toast(error.message, "neutral");
        else
          toast(
            message(error),
            "danger",
            retry(() => void latest.current.refine?.(generationId, variantId, action, instruction)),
          );
      } finally {
        useStudioSession.getState().setBusy(variantId, undefined);
      }
    },
    [repository, retriever],
  );

  const decline = useCallback(
    async (generationId: string, variantId: string) => {
      if (!repository || !retriever) return;
      const session = useStudioSession.getState();
      if (session.busy[variantId]) return;
      session.setBusy(variantId, "decline");
      try {
        await retriever.ready;
        const outcome = await declineVariant(
          repository,
          retriever.retriever,
          generationId,
          variantId,
        );
        useStudioSession.getState().patch({
          declination: { variantId, versions: outcome.versions },
          ...(outcome.notice ? { notice: outcome.notice } : {}),
        });
      } catch (error) {
        toast(
          message(error),
          "danger",
          retry(() => void latest.current.decline?.(generationId, variantId)),
        );
      } finally {
        useStudioSession.getState().setBusy(variantId, undefined);
      }
    },
    [repository, retriever],
  );

  useEffect(() => {
    latest.current = { generate, refine, decline };
  }, [generate, refine, decline]);

  return { generate, refine, decline, ready: Boolean(repository && retriever) };
}
