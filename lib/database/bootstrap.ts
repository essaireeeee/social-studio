/**
 * Démarrage des données dans le navigateur.
 *
 * 1. Base non vide : prête.
 * 2. Base vide et fichier local valide trouvé : on propose de le restaurer.
 * 3. Base vide sans fichier : données initiales (seed).
 */
import type { DataServices } from "./client";
import { SnapshotSchema, type SnapshotCounts } from "./snapshot";
import { runSeed, SEED_VERSION } from "./seed";

export interface RestoreOffer {
  name: string;
  savedAt: string;
  counts: SnapshotCounts;
}

export type BootResult = { kind: "ready" } | { kind: "restore-offer"; offer: RestoreOffer };

interface RestoreSummary {
  enabled?: boolean;
  found?: boolean;
  valid?: boolean;
  name?: string;
  savedAt?: string;
  counts?: SnapshotCounts;
  snapshot?: unknown;
}

const RESTORE_ENDPOINT = "/api/storage/restore";

async function fetchSummary(fetchImpl: typeof fetch, query = ""): Promise<RestoreSummary | null> {
  try {
    const response = await fetchImpl(`${RESTORE_ENDPOINT}${query}`, { cache: "no-store" });
    return (await response.json()) as RestoreSummary;
  } catch {
    return null;
  }
}

export async function prepareData(
  services: DataServices,
  fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args),
): Promise<BootResult> {
  const { repository } = services;
  if (!(await repository.isEmpty())) return { kind: "ready" };

  const summary = await fetchSummary(fetchImpl);
  if (summary?.enabled && summary.found && summary.valid && summary.savedAt && summary.counts) {
    return {
      kind: "restore-offer",
      offer: {
        name: summary.name ?? "hexagone-studio.json",
        savedAt: summary.savedAt,
        counts: summary.counts,
      },
    };
  }

  await runSeed(repository);
  return { kind: "ready" };
}

/** Restaure le fichier local dans une base vide. */
export async function acceptRestore(
  services: DataServices,
  fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args),
): Promise<void> {
  const summary = await fetchSummary(fetchImpl, "?include=snapshot");
  if (!summary?.found || !summary.valid || !summary.snapshot) {
    throw new Error("Le fichier de sauvegarde n'a pas pu être relu.");
  }
  await services.importSnapshot(summary.snapshot, "replace");
  // Un instantané sans version de seed ne doit pas réintroduire les exemples fictifs.
  if ((await services.repository.getMeta("seedVersion")) === undefined) {
    await services.repository.setMeta("seedVersion", SEED_VERSION);
  }
}

/**
 * Démarre sans restaurer. Le fichier actuel est d'abord copié dans `data/backups/`
 * (renvoyé tel quel avec la raison `manual`), puis les données initiales sont écrites.
 */
export async function declineRestore(
  services: DataServices,
  fetchImpl: typeof fetch = (...args) => globalThis.fetch(...args),
): Promise<void> {
  const summary = await fetchSummary(fetchImpl, "?include=snapshot");
  if (summary?.valid && summary.snapshot) {
    try {
      await services.fileSync.pushSnapshot(SnapshotSchema.parse(summary.snapshot), "manual");
    } catch {
      // La copie a échoué : la synchro est déjà marquée en erreur, on démarre quand même.
    }
  }
  await runSeed(services.repository);
}
