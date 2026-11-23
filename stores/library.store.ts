import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { LibrarySort } from "@/lib/library/query";

export type LibraryView = "list" | "grid";

interface LibraryStoreState {
  view: LibraryView;
  sort: LibrarySort;
  setView: (view: LibraryView) => void;
  setSort: (sort: LibrarySort) => void;
}

/**
 * Choix de vue et de tri de la bibliothèque, mémorisés dans localStorage. Réhydratation
 * explicite après le montage (`useLibraryStore.persist.rehydrate()`), comme le Studio.
 */
export const useLibraryStore = create<LibraryStoreState>()(
  persist(
    (set) => ({
      view: "list",
      sort: "date",
      setView: (view) => set({ view }),
      setSort: (sort) => set({ sort }),
    }),
    {
      name: "hex-library-view",
      storage: createJSONStorage(() => localStorage),
      partialize: ({ view, sort }) => ({ view, sort }),
      skipHydration: true,
    },
  ),
);
