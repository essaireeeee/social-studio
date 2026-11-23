import { create } from "zustand";
import type { LiveSessionInput } from "@/lib/shell/live-session";

interface UiStoreState {
  sidebarCollapsed: boolean;
  mobileNavOpen: boolean;
  commandOpen: boolean;
  sessionDialogOpen: boolean;
  /** Pré-remplissage d'une nouvelle session (fiche événement ouverte depuis la recherche). */
  sessionDraft?: LiveSessionInput;
  endSessionOpen: boolean;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setMobileNavOpen: (open: boolean) => void;
  setCommandOpen: (open: boolean) => void;
  setSessionDialogOpen: (open: boolean, draft?: LiveSessionInput) => void;
  setEndSessionOpen: (open: boolean) => void;
}

/** État d'interface du shell. La barre latérale repliée est mémorisée par `useSidebar`. */
export const useUiStore = create<UiStoreState>((set) => ({
  sidebarCollapsed: false,
  mobileNavOpen: false,
  commandOpen: false,
  sessionDialogOpen: false,
  endSessionOpen: false,
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  setSessionDialogOpen: (sessionDialogOpen, sessionDraft) =>
    set({ sessionDialogOpen, sessionDraft: sessionDialogOpen ? sessionDraft : undefined }),
  setEndSessionOpen: (endSessionOpen) => set({ endSessionOpen }),
}));
