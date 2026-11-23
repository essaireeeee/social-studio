"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRepository } from "@/hooks/useRepository";
import { getDataServices } from "@/lib/database/client";
import { connectRetriever, type ConnectedRetriever } from "@/lib/retrieval/service";
import { useStudioStore } from "@/stores/studio.store";

interface StudioContextValue {
  retriever: ConnectedRetriever | null;
  /** Brouillon relu depuis le stockage local (réhydraté par l'AppShell). */
  hydrated: boolean;
}

const StudioContext = createContext<StudioContextValue>({ retriever: null, hydrated: false });

export const useStudioContext = () => useContext(StudioContext);

const subscribeHydration = (callback: () => void) =>
  useStudioStore.persist.onFinishHydration(callback);

/** Recherche des références branchée sur la bibliothèque, et état du brouillon. */
export function StudioProvider({ children }: { children: ReactNode }) {
  const repository = useRepository();
  const [retriever, setRetriever] = useState<ConnectedRetriever | null>(null);
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => useStudioStore.persist.hasHydrated(),
    () => false,
  );

  useEffect(() => {
    if (!repository) return;
    let active = true;
    let connection: ConnectedRetriever | undefined;
    connectRetriever(getDataServices().repository).then((value) => {
      connection = value;
      if (active) setRetriever(value);
      else value.disconnect();
    });
    return () => {
      active = false;
      connection?.disconnect();
    };
  }, [repository]);

  return <StudioContext value={{ retriever, hydrated }}>{children}</StudioContext>;
}
