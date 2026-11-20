"use client";

import { useEffect, useState } from "react";
import { acceptRestore, declineRestore, prepareData } from "@/lib/database/bootstrap";
import { getDataServices, type DataServices } from "@/lib/database/client";
import { useDataStore } from "@/stores/data.store";
import { RestoreBackupDialog } from "./RestoreBackupDialog";

/** Garde-fou : en développement, React monte deux fois les effets (StrictMode). */
let started = false;

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Erreur inconnue.";
}

function markReady(services: DataServices): void {
  useDataStore.setState({ phase: "ready", restoreOffer: undefined, error: undefined });
  // Crée le fichier local s'il n'existe pas encore, sans attendre la prochaine modification.
  if (services.fileSync.getState().status === "idle") void services.fileSync.flush();
}

/**
 * Ouvre la base locale au chargement : seed au premier lancement,
 * ou proposition de restaurer le fichier `data/hexagone-studio.json`.
 */
export function DataBootstrap() {
  const phase = useDataStore((state) => state.phase);
  const offer = useDataStore((state) => state.restoreOffer);
  const bootError = useDataStore((state) => state.error);
  const [busy, setBusy] = useState<"restore" | "decline" | null>(null);
  const [actionError, setActionError] = useState<string>();

  useEffect(() => {
    if (started) return;
    started = true;
    const services = getDataServices();
    services.fileSync.subscribe((fileSync) => useDataStore.setState({ fileSync }));
    prepareData(services)
      .then((result) => {
        if (result.kind === "ready") markReady(services);
        else useDataStore.setState({ phase: "restore-prompt", restoreOffer: result.offer });
      })
      .catch((error: unknown) => {
        useDataStore.setState({ phase: "error", error: errorMessage(error) });
      });
  }, []);

  // Repère non visuel pour les tests de bout en bout.
  useEffect(() => {
    document.documentElement.dataset.db = phase;
  }, [phase]);

  const run = (kind: "restore" | "decline") => async () => {
    const services = getDataServices();
    setBusy(kind);
    setActionError(undefined);
    try {
      await (kind === "restore" ? acceptRestore(services) : declineRestore(services));
      markReady(services);
    } catch (error) {
      setActionError(errorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  if (phase === "restore-prompt" && offer) {
    return (
      <RestoreBackupDialog
        offer={offer}
        busy={busy}
        error={actionError}
        onRestore={run("restore")}
        onDecline={run("decline")}
      />
    );
  }

  if (phase === "error") {
    return (
      <div
        role="alert"
        className="fixed inset-x-4 bottom-4 z-50 rounded-md border border-danger/40 bg-card px-4 py-3 text-13 text-foreground"
      >
        Base locale indisponible : {bootError} Vérifiez que le navigateur autorise le stockage local
        (la navigation privée peut le bloquer).
      </div>
    );
  }

  return null;
}
