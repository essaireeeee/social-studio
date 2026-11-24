"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { useRepository } from "@/hooks/useRepository";
import { getDataServices } from "@/lib/database/client";
import type { SnapshotCounts } from "@/lib/database/snapshot";
import { formatDateTime } from "@/lib/format";
import { toast } from "@/stores/toast.store";
import { CountsTable } from "./CountsTable";
import { DataBlock } from "./DataBlock";
import { backupBeforeReplace } from "./download";
import { StepConfirm } from "./StepConfirm";

interface BackupEntry {
  name: string;
  savedAt: string;
}

interface Candidate {
  /** Absent : fichier principal. */
  backup?: string;
  savedAt: string;
  counts: SnapshotCounts;
  snapshot: unknown;
}

const STEPS = [
  {
    title: "Restaurer cette sauvegarde ?",
    description: "Les données actuelles seront remplacées par celles de la sauvegarde.",
    confirmLabel: "Continuer",
  },
  {
    title: "Dernière confirmation",
    description: "L'état actuel est d'abord sauvegardé automatiquement, puis remplacé.",
    confirmLabel: "Restaurer",
  },
];

/** Restauration depuis le fichier local ou une sauvegarde de `data/backups/`. */
export function RestorePanel() {
  const repository = useRepository();
  const [backups, setBackups] = useState<BackupEntry[] | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [candidate, setCandidate] = useState<Candidate | null>(null);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/storage/restore?list=backups")
      .then((r) => r.json())
      .then((body: { enabled: boolean; backups?: BackupEntry[] }) => {
        if (cancelled) return;
        setEnabled(body.enabled);
        setBackups(body.backups ?? []);
      })
      .catch(() => !cancelled && setBackups([]));
    return () => {
      cancelled = true;
    };
  }, []);

  const load = async (backup?: string) => {
    const query = backup ? `?backup=${encodeURIComponent(backup)}&include=snapshot` : "?include=snapshot";
    const body = await (await fetch(`/api/storage/restore${query}`)).json();
    if (!body.found || !body.valid) {
      toast(body.error ?? "Sauvegarde introuvable ou illisible.", "danger");
      return;
    }
    setCandidate({ backup, savedAt: body.savedAt, counts: body.counts, snapshot: body.snapshot });
  };

  const restore = async () => {
    if (!repository || !candidate) return;
    try {
      await repository.importAll(candidate.snapshot, "replace", { backup: backupBeforeReplace(getDataServices()) });
      toast("Sauvegarde restaurée", "success");
      setCandidate(null);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Restauration impossible.", "danger");
    }
  };

  return (
    <DataBlock
      title="Restaurer"
      description="Depuis le fichier local (data/hexagone-studio.json) ou une sauvegarde automatique du dossier data/backups."
    >
      {!enabled ? (
        <p className="text-13 text-muted-foreground">Sauvegarde fichier désactivée sur ce serveur.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <Button variant="secondary" className="self-start" onClick={() => void load()}>
            Fichier local
          </Button>
          {backups === null ? (
            <p className="text-xs text-muted-foreground">Recherche des sauvegardes…</p>
          ) : backups.length === 0 ? (
            <p className="text-xs text-muted-foreground">Aucune sauvegarde dans data/backups.</p>
          ) : (
            <ul className="flex flex-col gap-1" aria-label="Sauvegardes disponibles">
              {backups.map((b) => (
                <li key={b.name} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5 text-13">
                  <span>{formatDateTime(b.savedAt)}</span>
                  <Button size="sm" variant="ghost" onClick={() => void load(b.name)}>
                    Voir le contenu
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {candidate ? (
        <div className="flex flex-col gap-2">
          <CountsTable
            counts={candidate.counts}
            caption={`${candidate.backup ? "Sauvegarde" : "Fichier local"} du ${formatDateTime(candidate.savedAt)}`}
          />
          <Button variant="destructive" className="self-start" onClick={() => setConfirming(true)}>
            Restaurer…
          </Button>
        </div>
      ) : null}
      <StepConfirm steps={STEPS} open={confirming} onConfirm={() => void restore()} onClose={() => setConfirming(false)} />
    </DataBlock>
  );
}
