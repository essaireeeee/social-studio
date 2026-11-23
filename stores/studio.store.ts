import { create } from "zustand";
import { rememberCategory, switchMode, type BriefFields, type ModeMemory } from "@/lib/shell/mode";
import type { Mode } from "@/types/domain";

interface StudioStoreState extends ModeMemory {
  setMode: (mode: Mode) => void;
  /** Appelé par le Studio (Phase 8) à chaque choix de catégorie ou saisie. */
  remember: (categoryId: string, fields?: BriefFields) => void;
}

/**
 * Mode actif et mémoire du Studio. Le mode est aussi enregistré dans les réglages
 * (`lastMode`, persistant) et recopié dans localStorage pour l'affichage avant hydratation.
 */
export const useStudioStore = create<StudioStoreState>((set) => ({
  mode: "live",
  categoryByMode: {},
  common: {},
  setMode: (mode) => set((state) => switchMode(state, mode)),
  remember: (categoryId, fields) => set((state) => rememberCategory(state, categoryId, fields)),
}));
