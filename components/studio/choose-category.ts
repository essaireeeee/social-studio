import { getCategory } from "@/lib/categories/registry";
import { selectCategory } from "@/lib/studio/draft";
import { useStudioSession } from "@/stores/studio-session.store";
import { useStudioStore } from "@/stores/studio.store";
import type { HexEvent, LiveSession } from "@/types/domain";

/**
 * Choix d'une catégorie (clic ou raccourci) : le formulaire s'affiche aussitôt et le focus
 * va au premier champ requis (section 13.3).
 */
export function chooseCategory(
  categoryId: string,
  session: LiveSession | null,
  events: readonly HexEvent[] = [],
): void {
  useStudioStore.getState().updateDraft((d) => selectCategory(d, categoryId, session, events));
  const { errors, patch } = useStudioSession.getState();
  if (errors.category) {
    const { category: _removed, ...rest } = errors;
    patch({ errors: rest });
  }
  const first = getCategory(categoryId)?.required[0];
  if (first) requestAnimationFrame(() => document.getElementById(`field-${first}`)?.focus());
}
