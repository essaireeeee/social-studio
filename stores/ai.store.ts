import { create } from "zustand";
import type { ProviderHealth } from "@/lib/ai/indicator";
import type { ProviderId } from "@/lib/ai/types";

interface AiStoreState {
  /** Dernier état connu de chaque fournisseur (test de connexion, génération). */
  health: Record<ProviderId, ProviderHealth>;
  setHealth: (provider: ProviderId, health: ProviderHealth) => void;
}

/** État en mémoire de l'onglet : rien n'est persisté, une clé encore moins. */
export const useAiStore = create<AiStoreState>((set) => ({
  health: { anthropic: "unknown", openai: "unknown" },
  setHealth: (provider, health) =>
    set((state) => ({ health: { ...state.health, [provider]: health } })),
}));
