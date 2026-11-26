import { flushSync } from "react-dom";
import { getCategory } from "@/lib/categories/registry";
import { selectCategory } from "@/lib/studio/draft";
import { useStudioSession } from "@/stores/studio-session.store";
import { useStudioStore } from "@/stores/studio.store";
import type { HexEvent, LiveSession } from "@/types/domain";

/**
 * Choix d'une catégorie (clic ou raccourci) : le formulaire s'affiche aussitôt et le focus
 * va au premier champ requis (section 13.3). Le rendu est synchrone (`flushSync`) : un CM qui
 * tape tout de suite après le raccourci ne perd aucun caractère.
 */
export function chooseCategory(
  categoryId: string,
  session: LiveSession | null,
  events: readonly HexEvent[] = [],
): void {
  flushSync(() =>
    useStudioStore.getState().updateDraft((d) => selectCategory(d, categoryId, session, events)),
  );
  const { errors, patch } = useStudioSession.getState();
  if (errors.category) {
    const { category: _removed, ...rest } = errors;
    patch({ errors: rest });
  }
  const first = getCategory(categoryId)?.required[0];
  if (!first) return;
  const field = document.getElementById(`field-${first}`);
  if (field) field.focus();
  else requestAnimationFrame(() => document.getElementById(`field-${first}`)?.focus());
}
