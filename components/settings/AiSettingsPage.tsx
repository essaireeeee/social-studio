"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { Badge } from "@/components/ui/badge";
import { useAiStatus, useSessionCredentials } from "@/hooks/useAiSettings";
import { useRepository } from "@/hooks/useRepository";
import { engineIndicator, providerView, type ProviderView } from "@/lib/ai/indicator";
import type { ProviderId } from "@/lib/ai/types";
import { useAiStore } from "@/stores/ai.store";
import type { Engine } from "@/types/domain";
import { EngineChoice } from "./EngineChoice";
import { ProviderPanel } from "./ProviderPanel";

/** Paramètres > Intelligence artificielle (section 11.5). */
export function AiSettingsPage() {
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

  const choose = async (next: Engine) => {
    if (!repository || !settings || next === settings.aiProvider) return;
    await repository.saveSettings({ ...settings, aiProvider: next });
  };

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 py-6 sm:px-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <p className="font-mono text-xs tracking-[0.2em] text-muted-foreground">PARAMÈTRES</p>
          <h1 className="text-2xl font-semibold tracking-tight">Intelligence artificielle</h1>
          <p className="max-w-2xl text-13 text-muted-foreground">
            Les appels aux modèles passent uniquement par le serveur local. Aucune clé n&apos;est
            enregistrée dans la base, la sauvegarde JSON ou les journaux. Si le fournisseur échoue,
            le moteur natif prend le relais avec un message.
          </p>
        </div>
        <Badge
          variant={indicator.tone}
          className="self-start sm:self-auto"
          aria-label={`Moteur actif : ${indicator.text}`}
        >
          {indicator.text}
        </Badge>
      </header>

      <EngineChoice value={engine} views={views} disabled={!settings} onChange={choose} />

      <section className="flex flex-col gap-3" aria-labelledby="providers-title">
        <h2 id="providers-title" className="text-sm font-semibold">
          Fournisseurs
        </h2>
        {status === undefined ? (
          <div className="h-48 animate-pulse rounded-lg border border-border bg-card" aria-hidden />
        ) : status === null ? (
          <p className="text-13 text-danger" role="alert">
            État des fournisseurs illisible : le serveur local ne répond pas.
          </p>
        ) : (
          <div className="grid gap-4 lg:grid-cols-2">
            {status.providers.map((provider) => (
              <ProviderPanel
                key={provider.id}
                status={provider}
                view={views[provider.id]!}
                clientKeysAllowed={status.clientKeysAllowed}
                credentials={credentials[provider.id]}
                onCredentials={(patch) => update(provider.id, patch)}
                onClear={() => clear(provider.id)}
              />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
