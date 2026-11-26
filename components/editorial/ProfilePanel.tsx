"use client";

import { useLiveQuery } from "dexie-react-hooks";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import { formatDateTime, plural } from "@/lib/format";
import {
  CONFIDENCE_LABELS,
  activeProfile,
  computeProfile,
  listProfiles,
  pendingProfile,
  styleParameters,
} from "@/lib/editorial/profile-service";
import type { Mode } from "@/types/domain";
import { StyleProfileView } from "./StyleProfileView";

const MODE_LABELS: Record<Mode, string> = { live: "LIVE SHOW", daily: "DAILY & MEDIA" };

interface ProfilePanelProps {
  repository: DexieRepository;
  mode: Mode;
  onCompare: () => void;
}

export function ProfilePanel({ repository, mode, onCompare }: ProfilePanelProps) {
  const profiles = useLiveQuery(() => listProfiles(repository, mode), [repository, mode]);
  const [includeDemo, setIncludeDemo] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  if (!profiles) {
    return <div className="h-40 animate-pulse rounded-xl bg-card squircle" aria-hidden />;
  }

  const active = activeProfile(profiles);
  const pending = pendingProfile(profiles);
  const shown = pending ?? active;
  const defaults = styleParameters(undefined, mode);

  const analyze = async () => {
    setBusy(true);
    setError(undefined);
    try {
      await computeProfile(repository, mode, { includeDemo });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Analyse impossible.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 rounded-xl bg-card p-4 squircle sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold">Profil {MODE_LABELS[mode]}</span>
            {shown ? (
              <>
                <Badge variant={shown.status === "validated" ? "success" : "warning"}>
                  {shown.status === "validated" ? "Validé" : "Proposé, non validé"}
                </Badge>
                <Badge>Confiance : {CONFIDENCE_LABELS[shown.confidence]}</Badge>
              </>
            ) : null}
          </div>
          <p className="text-13 text-muted-foreground">
            {active
              ? `Les moteurs utilisent le profil validé le ${formatDateTime(active.validatedAt ?? active.createdAt)}.`
              : "Aucun profil validé : les moteurs utilisent les valeurs par défaut."}
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:items-end">
          <Button onClick={analyze} loading={busy} className="h-11 sm:h-8">
            {profiles.length === 0 ? "Analyser la bibliothèque" : "Recalculer"}
          </Button>
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              className="size-4 accent-[var(--accent)]"
              checked={includeDemo}
              onChange={(event) => setIncludeDemo(event.target.checked)}
            />
            Inclure les exemples fictifs
          </label>
        </div>
      </div>

      {error ? (
        <p role="alert" className="text-13 text-danger">
          {error}
        </p>
      ) : null}

      {pending && active ? (
        <div className="flex flex-col gap-2 rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-13 sm:flex-row sm:items-center sm:justify-between">
          <span>
            Nouveau profil calculé le {formatDateTime(pending.createdAt)} (
            {plural(pending.corpusSize, "publication")}). Il n&apos;est pas encore validé.
          </span>
          <Button variant="secondary" size="sm" onClick={onCompare}>
            Comparer et valider
          </Button>
        </div>
      ) : null}

      {shown?.includesDemo ? (
        <p className="rounded-md border border-warning/30 bg-warning/10 px-4 py-3 text-13">
          Profil calculé avec les exemples fictifs : indicatif seulement. Il ne peut pas être validé
          ni alimenter les moteurs.
        </p>
      ) : null}

      {!shown ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-13 text-muted-foreground">
          Aucune analyse pour l&apos;instant. Lancez l&apos;analyse pour mesurer le style des
          publications {MODE_LABELS[mode]} de la bibliothèque.
        </p>
      ) : shown.confidence === "insufficient" ? (
        <div className="flex flex-col gap-3 rounded-xl bg-card p-4 text-13 squircle">
          <p className="font-medium text-foreground">
            Corpus insuffisant pour tirer des conclusions (
            {plural(shown.corpusSize, "publication analysée", "publications analysées")}).
          </p>
          <p className="text-muted-foreground">
            Ajoutez au moins 5 publications {MODE_LABELS[mode]} réelles dans la bibliothèque. En
            attendant, les moteurs utilisent les valeurs par défaut : {defaults.charsMedian}{" "}
            caractères en médiane, {defaults.linesMedian} lignes, {defaults.emojisPerPostMedian}{" "}
            emojis par post (alerte au-delà de {defaults.emojiThreshold}),{" "}
            {defaults.hashtagsPerPostMedian} hashtag(s) en fin de post.
          </p>
          <p className="text-xs text-muted-foreground">
            Analyse du {formatDateTime(shown.createdAt)}.
          </p>
        </div>
      ) : (
        <StyleProfileView profile={shown} />
      )}
    </div>
  );
}
