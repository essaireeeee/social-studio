import { create } from "zustand";
import type { RestoreOffer } from "@/lib/database/bootstrap";
import type { FileSyncState } from "@/lib/database/file-sync";

export type DataPhase = "loading" | "restore-prompt" | "ready" | "error";

interface DataStoreState {
  phase: DataPhase;
  error?: string;
  restoreOffer?: RestoreOffer;
  /** État de la synchro fichier, affiché dans le header (Phase 7). */
  fileSync: FileSyncState;
}

/** État du démarrage des données et de la synchro fichier. */
export const useDataStore = create<DataStoreState>(() => ({
  phase: "loading",
  fileSync: { status: "idle" },
}));
