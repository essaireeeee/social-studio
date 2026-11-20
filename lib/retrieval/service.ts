/**
 * Raccordement du retriever à la base : index tenu à jour en direct, et recherche
 * des références d'un brief avec le contexte stocké (combattants, événements,
 * Session Live, générations récentes, poids des réglages).
 */
import { liveQuery } from "dexie";
import type { DexieRepository } from "@/lib/database/dexie-repository";
import type { DataRepository } from "@/lib/database/repository";
import type { Brief } from "@/types/domain";
import {
  LocalBm25Retriever,
  buildRetrievalQuery,
  type ReferenceResult,
  type Retriever,
} from "./retriever";

export interface ConnectedRetriever {
  retriever: LocalBm25Retriever;
  /** Résolue après le premier chargement de l'index. */
  ready: Promise<void>;
  disconnect(): void;
}

/**
 * Construit l'index au chargement puis le met à jour à chaque écriture de la table
 * `wordings`, y compris depuis un autre onglet (observation Dexie). Seuls les posts
 * nouveaux, modifiés ou supprimés sont réindexés.
 */
export async function connectRetriever(repository: DexieRepository): Promise<ConnectedRetriever> {
  const signatures = await repository.signatures.list();
  const retriever = new LocalBm25Retriever({ signatures });
  let markReady!: () => void;
  let fail!: (error: unknown) => void;
  const ready = new Promise<void>((resolve, reject) => {
    markReady = resolve;
    fail = reject;
  });
  const subscription = liveQuery(() => repository.db.wordings.toArray()).subscribe({
    next: (wordings) => {
      retriever.sync(wordings);
      markReady();
    },
    error: (error: unknown) => fail(error),
  });
  return { retriever, ready, disconnect: () => subscription.unsubscribe() };
}

export interface FindReferencesOptions {
  excludeIds?: readonly string[];
  includeDemo?: boolean;
  now?: Date;
}

export async function findReferences(
  repository: DataRepository,
  retriever: Retriever,
  brief: Brief,
  options: FindReferencesOptions = {},
): Promise<ReferenceResult[]> {
  const [fighters, events, sessions, recentGenerations, settings] = await Promise.all([
    repository.fighters.list(),
    repository.events.list(),
    repository.liveSessions.list(),
    repository.generations.list({ orderBy: "createdAt", reverse: true, limit: 5 }),
    repository.getSettings(),
  ]);
  const liveSession = brief.liveSessionId
    ? sessions.find((s) => s.id === brief.liveSessionId)
    : sessions.find((s) => s.active);

  return retriever.retrieve(
    buildRetrievalQuery(brief, {
      fighters,
      events,
      liveSession,
      recentGenerations,
      weights: settings.retrievalWeights,
      ...options,
    }),
  );
}
