"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Cell, GroupedSection } from "@/components/ui/grouped-list";
import { Switch } from "@/components/ui/switch";
import { useSessionCredentials } from "@/hooks/useAiSettings";
import { fetchFrenchStatus, probeLanguageToolFromClient } from "@/lib/french/client";
import type { FrenchProbeResponse, FrenchStatusResponse } from "@/lib/french/remote";
import { ENGINE_LABELS } from "@/lib/history/history";
import type { Settings } from "@/types/domain";
import type { FrenchPrefsPatch } from "./useFrenchPrefs";

/** Couches actives, état de LanguageTool (bouton « Tester ») et de la relecture IA. */
export function LayersGroup({
  settings,
  onChange,
}: {
  settings: Settings;
  onChange: (patch: FrenchPrefsPatch) => void;
}) {
  const [status, setStatus] = useState<FrenchStatusResponse | null>();
  const [probe, setProbe] = useState<FrenchProbeResponse>();
  const [probing, setProbing] = useState(false);
  const { credentials } = useSessionCredentials();
  const layers = settings.french.layers;

  useEffect(() => {
    let active = true;
    void fetchFrenchStatus().then((value) => {
      if (active) setStatus(value ?? null);
    });
    return () => {
      active = false;
    };
  }, []);

  const test = async () => {
    setProbing(true);
    setProbe(await probeLanguageToolFromClient());
    setProbing(false);
  };

  const ltState =
    status === undefined
      ? "Vérification…"
      : status === null
        ? "Serveur local injoignable"
        : status.languagetool.configured
          ? "Adresse configurée dans .env.local"
          : "LANGUAGETOOL_URL absent de .env.local : couche ignorée";

  const engine = settings.aiProvider;
  const aiState =
    engine === "native"
      ? "Moteur natif choisi : la relecture IA ne tourne pas"
      : status && (status.ai[engine] || credentials[engine]?.key)
        ? `${ENGINE_LABELS[engine]} prêt`
        : `${ENGINE_LABELS[engine]} : aucune clé, la relecture est ignorée`;

  return (
    <GroupedSection
      id="couches"
      header="Couches de vérification"
      footer={
        <>
          Une couche indisponible est ignorée sans bloquer l&apos;écriture. Le moteur IA se choisit
          dans{" "}
          <Link href="/settings/ai" className="text-accent-text underline">
            Paramètres &gt; Intelligence artificielle
          </Link>
          .
        </>
      }
    >
      <Cell
        title="Règles locales"
        subtitle="Hors ligne, plus de 150 règles"
        value="Toujours active"
      />
      <Cell
        title="LanguageTool"
        titleId="layer-lt"
        subtitle={<span data-testid="lt-state">{ltState}</span>}
        accessory={
          <Switch
            checked={layers.languagetool}
            onCheckedChange={(value) => onChange({ layers: { languagetool: value } })}
            aria-labelledby="layer-lt"
          />
        }
      />
      <li className="flex flex-wrap items-center gap-3 px-4 py-2">
        <Button variant="secondary" size="sm" onClick={() => void test()} loading={probing}>
          Tester
        </Button>
        {probe ? (
          <span
            role="status"
            className={probe.ok ? "text-footnote text-success" : "text-footnote text-danger"}
          >
            {probe.message}
          </span>
        ) : null}
      </li>
      <Cell
        title="Relecture IA"
        titleId="layer-ai"
        subtitle={<span data-testid="ai-state">{aiState}</span>}
        accessory={
          <Switch
            checked={layers.ai}
            onCheckedChange={(value) => onChange({ layers: { ai: value } })}
            aria-labelledby="layer-ai"
          />
        }
      />
    </GroupedSection>
  );
}
