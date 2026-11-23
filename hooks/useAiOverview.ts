"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { engineIndicator, providerView, type ProviderView } from "@/lib/ai/indicator";
import type { ProviderId } from "@/lib/ai/types";
import { useAiStore } from "@/stores/ai.store";
import type { Engine } from "@/types/domain";
import { useAiStatus, useSessionCredentials } from "./useAiSettings";
import { useRepository } from "./useRepository";

/** État complet du moteur : réglage, fournisseurs, clés de session, indicateur affiché. */
export function useAiOverview() {
  const repository = useRepository();
  const settings = useLiveQuery(() => repository?.getSettings(), [repository]);
  const status = useAiStatus();
  const { credentials, update, clear } = useSessionCredentials();
  const health = useAiStore((state) => state.health);

  const views: Partial<Record<ProviderId, ProviderView>> = Object.fromEntries(
    (status?.providers ?? []).map((p) => [
      p.id,
      providerView(p, credentials[p.id], status?.clientKeysAllowed ?? false),
    ]),
  );
  const engine: Engine = settings?.aiProvider ?? "native";
  const indicator = engineIndicator(
    engine,
    engine === "native" ? undefined : views[engine],
    engine === "native" ? "unknown" : health[engine],
  );

  const chooseEngine = async (next: Engine) => {
    if (!repository || !settings || next === settings.aiProvider) return;
    await repository.saveSettings({ ...settings, aiProvider: next });
  };

  return { settings, status, credentials, update, clear, views, engine, indicator, chooseEngine };
}
