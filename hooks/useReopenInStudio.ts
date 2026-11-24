"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { useMode } from "@/hooks/useMode";
import { draftFromBrief } from "@/lib/studio/draft";
import { useStudioStore } from "@/stores/studio.store";
import type { Generation } from "@/types/domain";

/** « Rouvrir dans le Studio » : mode, brief et génération de l'historique, puis le Studio. */
export function useReopenInStudio() {
  const router = useRouter();
  const { setMode } = useMode();
  return useCallback(
    (generation: Generation) => {
      void setMode(generation.brief.mode);
      const store = useStudioStore.getState();
      store.updateDraft(() => draftFromBrief(generation.brief));
      store.setGeneration(generation.id);
      router.push("/studio");
    },
    [router, setMode],
  );
}
