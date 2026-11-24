"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRepository } from "@/hooks/useRepository";
import { getDataServices } from "@/lib/database/client";
import { exportFileName, snapshotJson } from "@/lib/data/export";
import { resetApplication } from "@/lib/data/maintenance";
import { toast } from "@/stores/toast.store";
import { DataBlock } from "./DataBlock";
import { backupBeforeReplace, downloadFile } from "./download";
import { StepConfirm } from "./StepConfirm";

const STEPS = [
  {
    title: "Réinitialiser l'application ?",
    description: "Toutes les données seront effacées : bibliothèque, fiches, générations, réglages, profils.",
    confirmLabel: "Continuer",
  },
  {
    title: "Export automatique",
    description: "Un export JSON complet va être téléchargé, et une copie placée dans data/backups si la sauvegarde fichier est active.",
    confirmLabel: "Continuer",
  },
  {
    title: "Dernière confirmation",
    description: "L'application repartira de son état du premier lancement, avec les exemples fictifs.",
    confirmLabel: "Réinitialiser",
    typed: "RÉINITIALISER",
  },
];

/** Réinitialisation complète : triple confirmation, export automatique avant. */
export function ResetPanel() {
  const repository = useRepository();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = async () => {
    if (!repository) return;
    setBusy(true);
    try {
      const now = new Date();
      downloadFile(exportFileName("avant-reinitialisation", "json", now), snapshotJson(await repository.exportAll()), "application/json");
      await resetApplication(repository, backupBeforeReplace(getDataServices()), now);
      try {
        localStorage.removeItem("hex-studio-draft");
        localStorage.removeItem("hex-library-view");
      } catch {
        // Stockage indisponible : rien à effacer.
      }
      // Rechargement complet voulu : tous les états en mémoire (Studio, index) repartent de zéro.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Réinitialisation impossible.", "danger");
      setBusy(false);
    }
  };

  return (
    <DataBlock
      title="Réinitialiser l'application"
      description="Efface tout et rétablit l'état du premier lancement. Un export est fait automatiquement avant."
    >
      <Button variant="destructive" className="self-start" loading={busy} onClick={() => setConfirming(true)}>
        Réinitialiser l&apos;application…
      </Button>
      <StepConfirm steps={STEPS} open={confirming} onConfirm={() => void reset()} onClose={() => setConfirming(false)} />
    </DataBlock>
  );
}
