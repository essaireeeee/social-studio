"use client";

import { useId, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { KEY_SOURCE_LABELS, type ProviderView } from "@/lib/ai/indicator";
import type { ProviderStatus, TestResponse } from "@/lib/ai/service";
import { testConnection, type SessionCredentials } from "@/lib/generation/ai-client";
import { useAiStore } from "@/stores/ai.store";

const ENV_NAMES = {
  anthropic: { key: "ANTHROPIC_API_KEY", model: "ANTHROPIC_MODEL" },
  openai: { key: "OPENAI_API_KEY", model: "OPENAI_MODEL" },
} as const;

interface ProviderPanelProps {
  status: ProviderStatus;
  view: ProviderView;
  clientKeysAllowed: boolean;
  credentials: SessionCredentials;
  onCredentials: (patch: SessionCredentials) => void;
  onClear: () => void;
}

/** Un fournisseur : statut, clé de session, modèle, test de connexion réel (section 11.5). */
export function ProviderPanel({
  status,
  view,
  clientKeysAllowed,
  credentials,
  onCredentials,
  onClear,
}: ProviderPanelProps) {
  const keyId = useId();
  const modelId = useId();
  const setHealth = useAiStore((state) => state.setHealth);
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<TestResponse | null>(null);
  const env = ENV_NAMES[status.id];
  const sessionAllowed = clientKeysAllowed && !status.keyInEnv;

  const runTest = async () => {
    setTesting(true);
    setResult(null);
    const response = await testConnection(status.id);
    setResult(response);
    setHealth(status.id, "ok" in response && response.ok ? "ok" : "error");
    setTesting(false);
  };

  return (
    <section
      className="flex flex-col gap-4 rounded-lg border border-border bg-card p-4"
      aria-labelledby={`${keyId}-title`}
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h3 id={`${keyId}-title`} className="text-sm font-semibold">
          {status.label}
        </h3>
        <Badge variant={view.configured ? "success" : "neutral"}>
          {view.keySource !== "none" && !view.model
            ? "Modèle manquant"
            : KEY_SOURCE_LABELS[view.keySource]}
        </Badge>
      </header>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={keyId} className="text-xs font-medium text-muted-foreground">
          Clé API
        </label>
        {status.keyInEnv ? (
          <p className="text-13">
            Lue dans <code className="font-mono text-xs">{env.key}</code> (.env.local) : prioritaire
            sur toute clé saisie ici.
          </p>
        ) : sessionAllowed ? (
          <>
            <div className="flex gap-2">
              <Input
                id={keyId}
                type="password"
                autoComplete="off"
                spellCheck={false}
                placeholder="Coller la clé"
                value={credentials.key ?? ""}
                onChange={(event) => onCredentials({ key: event.target.value.trim() || undefined })}
              />
              {credentials.key || credentials.model ? (
                <Button variant="secondary" onClick={onClear}>
                  Effacer
                </Button>
              ) : null}
            </div>
            <p className="text-xs text-muted-foreground">
              Conservée uniquement pour cette session de navigateur. Jamais enregistrée.
            </p>
          </>
        ) : (
          <p className="text-13 text-muted-foreground">
            Saisie de clé désactivée en production (
            <code className="font-mono text-xs">ALLOW_CLIENT_KEYS</code> n&apos;est pas à{" "}
            <code className="font-mono text-xs">true</code>). Renseignez{" "}
            <code className="font-mono text-xs">{env.key}</code> dans .env.local.
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor={modelId} className="text-xs font-medium text-muted-foreground">
          Modèle
        </label>
        {status.modelInEnv ? (
          <p className="text-13">
            <span className="font-mono">{status.modelInEnv}</span>{" "}
            <span className="text-muted-foreground">
              (défini par <code className="font-mono text-xs">{env.model}</code>, non modifiable
              ici)
            </span>
          </p>
        ) : clientKeysAllowed ? (
          <Input
            id={modelId}
            autoComplete="off"
            spellCheck={false}
            placeholder={status.defaultModel ?? "Nom du modèle"}
            value={credentials.model ?? ""}
            onChange={(event) => onCredentials({ model: event.target.value.trim() || undefined })}
          />
        ) : (
          <p className="text-13">
            {status.defaultModel ? (
              <span className="font-mono">{status.defaultModel}</span>
            ) : (
              <span className="text-muted-foreground">
                Aucun modèle : renseignez <code className="font-mono text-xs">{env.model}</code>.
              </span>
            )}
          </p>
        )}
        {!status.modelInEnv && view.model && !credentials.model ? (
          <p className="text-xs text-muted-foreground">
            Modèle utilisé : {view.model} (par défaut).
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <Button
          variant="secondary"
          className="self-start"
          loading={testing}
          disabled={!view.configured}
          onClick={runTest}
        >
          Tester la connexion
        </Button>
        {result ? <TestResult result={result} /> : null}
      </div>
    </section>
  );
}

function TestResult({ result }: { result: TestResponse }) {
  if ("fallback" in result) {
    return <p className="text-13 text-danger">Échec : {result.reason}</p>;
  }
  return result.ok ? (
    <p className="text-13 text-success" role="status">
      Connexion établie · {result.latencyMs} ms · modèle {result.model}
    </p>
  ) : (
    <p className="text-13 text-danger" role="alert">
      Échec : {result.error}
    </p>
  );
}
