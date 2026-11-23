"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { AiStatusResponse } from "@/lib/ai/service";
import type { ProviderId } from "@/lib/ai/types";
import {
  clearSessionCredentials,
  fetchAiStatus,
  sessionCredentialsSnapshot,
  subscribeSessionCredentials,
  writeSessionCredentials,
  type SessionCredentials,
} from "@/lib/generation/ai-client";

/** État des fournisseurs déclaré par le serveur. `undefined` : chargement ; `null` : échec. */
export function useAiStatus(): AiStatusResponse | null | undefined {
  const [status, setStatus] = useState<AiStatusResponse | null | undefined>(undefined);
  useEffect(() => {
    let active = true;
    fetchAiStatus().then((value) => {
      if (active) setStatus(value ?? null);
    });
    return () => {
      active = false;
    };
  }, []);
  return status;
}

type CredentialsMap = Record<ProviderId, SessionCredentials>;
const EMPTY_SNAPSHOT = JSON.stringify({ anthropic: {}, openai: {} });

/** Clés et modèles de session (sessionStorage) ; vides au rendu serveur, sans écart d'hydratation. */
export function useSessionCredentials() {
  const snapshot = useSyncExternalStore(
    subscribeSessionCredentials,
    sessionCredentialsSnapshot,
    () => EMPTY_SNAPSHOT,
  );
  const credentials = useMemo(() => JSON.parse(snapshot) as CredentialsMap, [snapshot]);
  return {
    credentials,
    update: (provider: ProviderId, patch: SessionCredentials) =>
      writeSessionCredentials(provider, patch),
    clear: (provider: ProviderId) => clearSessionCredentials(provider),
  };
}
