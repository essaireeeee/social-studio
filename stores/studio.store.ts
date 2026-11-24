import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";
import { EMPTY_DRAFTS, carryCommon, type Drafts, type StudioDraft } from "@/lib/studio/draft";
import type { Mode, Platform } from "@/types/domain";

export type MobileTab = "brief" | "results" | "preview";

interface StudioStoreState {
  mode: Mode;
  /** Brouillon du brief, un par mode (persisté). */
  drafts: Drafts;
  /** Génération affichée dans chaque mode (persistée). */
  generationIds: Partial<Record<Mode, string>>;
  /** Plateforme de l'aperçu, un réglage par mode (persisté). */
  previewPlatforms: Partial<Record<Mode, Platform>>;
  mobileTab: MobileTab;
  /** Pastille « nouvelle génération » sur l'onglet Résultats. */
  resultsBadge: boolean;
  /** Entre 1 024 et 1 279 px : panneau d'aperçu ouvert. */
  previewPanelOpen: boolean;
  setPreviewPanelOpen: (open: boolean) => void;
  setMode: (mode: Mode) => void;
  updateDraft: (fn: (draft: StudioDraft) => StudioDraft) => void;
  setGeneration: (id: string | undefined) => void;
  setPreviewPlatform: (platform: Platform) => void;
  setMobileTab: (tab: MobileTab) => void;
  setResultsBadge: (value: boolean) => void;
}

const DRAFT_KEY = "hex-studio-draft";
const SAVE_DELAY_MS = 300;

/**
 * localStorage avec écriture différée (300 ms) : une rafale de frappes, une écriture.
 * Une écriture en attente est faite tout de suite si la page est quittée ou masquée
 * (navigation, onglet fermé) : le brouillon n'est jamais perdu.
 */
function debouncedStorage(): StateStorage {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let pending: [string, string] | undefined;
  const write = () => {
    clearTimeout(timer);
    if (!pending) return;
    const [name, value] = pending;
    pending = undefined;
    try {
      window.localStorage.setItem(name, value);
    } catch {
      // Stockage plein ou indisponible : le brouillon reste en mémoire.
    }
  };
  if (typeof window !== "undefined") {
    window.addEventListener("pagehide", write);
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") write();
    });
  }
  return {
    getItem: (name) => {
      try {
        return window.localStorage.getItem(name);
      } catch {
        return null;
      }
    },
    setItem: (name, value) => {
      pending = [name, value];
      clearTimeout(timer);
      timer = setTimeout(write, SAVE_DELAY_MS);
    },
    removeItem: (name) => {
      pending = undefined;
      clearTimeout(timer);
      try {
        window.localStorage.removeItem(name);
      } catch {
        // Rien à faire.
      }
    },
  };
}

/**
 * Mode actif et brouillon du Studio. Le mode est aussi enregistré dans les réglages
 * (`lastMode`) ; le brouillon est mémorisé localement (aucune donnée sensible, aucune clé).
 * Réhydratation explicite (`useStudioStore.persist.rehydrate()`) après le montage, pour que
 * le rendu serveur et le premier rendu client restent identiques.
 */
export const useStudioStore = create<StudioStoreState>()(
  persist(
    (set) => ({
      mode: "live",
      drafts: EMPTY_DRAFTS,
      generationIds: {},
      previewPlatforms: {},
      mobileTab: "brief",
      resultsBadge: false,
      previewPanelOpen: false,
      setPreviewPanelOpen: (previewPanelOpen) => set({ previewPanelOpen }),
      setMode: (mode) =>
        set((state) =>
          state.mode === mode
            ? state
            : { mode, drafts: carryCommon(state.drafts, state.mode, mode) },
        ),
      updateDraft: (fn) =>
        set((state) => ({
          drafts: { ...state.drafts, [state.mode]: fn(state.drafts[state.mode]) },
        })),
      setGeneration: (id) =>
        set((state) => ({ generationIds: { ...state.generationIds, [state.mode]: id } })),
      setPreviewPlatform: (platform) =>
        set((state) => ({
          previewPlatforms: { ...state.previewPlatforms, [state.mode]: platform },
        })),
      setMobileTab: (mobileTab) =>
        set((state) => ({
          mobileTab,
          resultsBadge: mobileTab === "results" ? false : state.resultsBadge,
        })),
      setResultsBadge: (resultsBadge) => set({ resultsBadge }),
    }),
    {
      name: DRAFT_KEY,
      version: 1,
      storage: createJSONStorage(debouncedStorage),
      skipHydration: true,
      partialize: (state) => ({
        drafts: state.drafts,
        generationIds: state.generationIds,
        previewPlatforms: state.previewPlatforms,
      }),
    },
  ),
);
