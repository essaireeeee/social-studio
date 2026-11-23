"use client";

import { useEffect } from "react";
import { copyText } from "@/components/editor/VariantActions";
import { chooseCategory } from "@/components/studio/choose-category";
import { getCategoryByShortcut } from "@/lib/categories/registry";
import { showInPreview } from "@/lib/studio/actions";
import { useStudioSession } from "@/stores/studio-session.store";
import { useStudioStore } from "@/stores/studio.store";
import type { LiveSession, Settings } from "@/types/domain";
import { useRepository } from "./useRepository";
import { useStudioActions } from "./useStudioActions";

function isField(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  return Boolean(
    el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName)),
  );
}

const modalOpen = () =>
  Boolean(document.querySelector('[role="dialog"][data-state="open"], [role="alertdialog"]'));

/** Texte sélectionné, y compris dans un champ ; vide s'il n'y en a pas. */
function selectedText(): string {
  const el = document.activeElement as HTMLInputElement | HTMLTextAreaElement | null;
  if (
    el &&
    (el.tagName === "TEXTAREA" || el.tagName === "INPUT") &&
    el.selectionStart !== el.selectionEnd
  ) {
    return el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0);
  }
  return window.getSelection()?.toString() ?? "";
}

/** Raccourcis du Studio (section 13.6). `Alt+L`, `Alt+D` et `Cmd/Ctrl+K` sont globaux. */
export function useStudioShortcuts(
  settings: Settings | undefined,
  session: LiveSession | null | undefined,
  onHelp: () => void,
): void {
  const repository = useRepository();
  const { generate } = useStudioActions();

  useEffect(() => {
    const onKeyDown = async (event: KeyboardEvent) => {
      const mod = event.metaKey || event.ctrlKey;
      if (mod && event.key === "Enter") {
        event.preventDefault();
        void generate();
        return;
      }
      const copyCombo =
        settings?.copyShortcut === "mod+alt+c"
          ? mod && event.altKey && !event.shiftKey
          : mod && event.shiftKey && !event.altKey;
      if (copyCombo && event.code === "KeyC") {
        event.preventDefault();
        const selection = selectedText();
        if (selection) return void copyText(selection);
        const { mode, generationIds } = useStudioStore.getState();
        const id = generationIds[mode];
        const generation = id && repository ? await repository.generations.get(id) : undefined;
        const variant = generation?.variants.find((v) => v.selected) ?? generation?.variants[0];
        if (variant) {
          const live = useStudioSession.getState().liveText[variant.id];
          void copyText(live ?? variant.revisions.at(-1)!.text);
        }
        return;
      }
      if (event.altKey && !mod && /^Digit[1-3]$/.test(event.code)) {
        event.preventDefault();
        const { mode, generationIds } = useStudioStore.getState();
        const id = generationIds[mode];
        const generation = id && repository ? await repository.generations.get(id) : undefined;
        const variant = generation?.variants[Number(event.code.slice(5)) - 1];
        if (repository && generation && variant)
          await showInPreview(repository, generation.id, variant.id);
        return;
      }
      if (isField(event.target) || modalOpen() || mod || event.altKey) return;
      if (event.key === "?") {
        event.preventDefault();
        onHelp();
        return;
      }
      if (useStudioStore.getState().mode !== "live") return;
      const category = getCategoryByShortcut(event.key);
      if (category) {
        event.preventDefault();
        chooseCategory(category.id, session ?? null);
      }
    };
    const listener = (event: KeyboardEvent) => void onKeyDown(event);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [generate, repository, settings?.copyShortcut, session, onHelp]);
}
