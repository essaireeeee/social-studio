"use client";

import { Badge } from "@/components/ui/badge";
import { useAiOverview } from "@/hooks/useAiOverview";
import { EngineChoice } from "./EngineChoice";
import { ProviderPanel } from "./ProviderPanel";
import { LargeTitle } from "@/components/layout/ScreenTitle";

/** Paramètres > Intelligence artificielle (section 11.5). */
export function AiSettingsPage() {
  const { settings, status, credentials, update, clear, views, engine, indicator, chooseEngine } =
    useAiOverview();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-4 pt-3 pb-10 sm:px-6">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-1">
          <LargeTitle>Intelligence artificielle</LargeTitle>
          <p className="max-w-2xl text-subheadline text-muted-foreground">
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

      <EngineChoice value={engine} views={views} disabled={!settings} onChange={chooseEngine} />

      <section className="flex flex-col gap-3" aria-labelledby="providers-title">
        <h2 id="providers-title" className="text-sm font-semibold">
          Fournisseurs
        </h2>
        {status === undefined ? (
          <div className="h-48 animate-pulse rounded-xl bg-card squircle" aria-hidden />
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
    </div>
  );
}
