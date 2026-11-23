/**
 * Côté client de la couche IA : clé de session et appels aux routes locales.
 *
 * La clé saisie dans l'interface vit uniquement dans `sessionStorage` (onglet courant),
 * part vers la route locale dans l'en-tête `x-hex-provider-key`, et n'est jamais écrite
 * dans IndexedDB, localStorage ni la sauvegarde JSON (règle 1.5).
 * Aucun import de SDK ici : les appels aux fournisseurs restent côté serveur.
 */
import { KEY_HEADER, MODEL_HEADER } from "@/lib/ai/keys";
import type { DeclineRequest, GenerateRequest, RefineRequest } from "@/lib/ai/schema";
import type {
  AiFallback,
  AiStatusResponse,
  DeclineResponse,
  GenerateResponse,
  RefineResponse,
  TestResponse,
} from "@/lib/ai/service";
import type { ProviderId } from "@/lib/ai/types";

const STORAGE_PREFIX = "hex-ai-session:";

export interface SessionCredentials {
  key?: string;
  model?: string;
}

function storage(): Storage | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function readSessionCredentials(provider: ProviderId): SessionCredentials {
  try {
    const raw = storage()?.getItem(STORAGE_PREFIX + provider);
    if (!raw) return {};
    const value = JSON.parse(raw) as SessionCredentials;
    return {
      key: typeof value.key === "string" && value.key ? value.key : undefined,
      model: typeof value.model === "string" && value.model ? value.model : undefined,
    };
  } catch {
    return {};
  }
}

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

/** Abonnement aux changements de clé de session (pour `useSyncExternalStore`). */
export function subscribeSessionCredentials(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Instantané stable (chaîne) des identifiants de session des deux fournisseurs. */
export function sessionCredentialsSnapshot(): string {
  return JSON.stringify({
    anthropic: readSessionCredentials("anthropic"),
    openai: readSessionCredentials("openai"),
  });
}

export function writeSessionCredentials(provider: ProviderId, patch: SessionCredentials): void {
  const next = { ...readSessionCredentials(provider), ...patch };
  const store = storage();
  if (!store) return;
  try {
    if (!next.key && !next.model) store.removeItem(STORAGE_PREFIX + provider);
    else store.setItem(STORAGE_PREFIX + provider, JSON.stringify(next));
  } finally {
    notify();
  }
}

export function clearSessionCredentials(provider: ProviderId): void {
  try {
    storage()?.removeItem(STORAGE_PREFIX + provider);
  } finally {
    notify();
  }
}

function headersFor(provider: ProviderId): Record<string, string> {
  const { key, model } = readSessionCredentials(provider);
  return {
    "Content-Type": "application/json",
    ...(key ? { [KEY_HEADER]: key } : {}),
    ...(model ? { [MODEL_HEADER]: model } : {}),
  };
}

const unreachable: AiFallback = {
  fallback: true,
  reason: "serveur local injoignable",
  code: "network",
};

async function post<T>(path: string, provider: ProviderId, body: unknown): Promise<T | AiFallback> {
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: headersFor(provider),
      body: JSON.stringify(body),
      cache: "no-store",
    });
    return (await response.json()) as T;
  } catch {
    return unreachable;
  }
}

/** Transport vers les routes IA ; remplaçable dans les tests. */
export interface AiTransport {
  generate(body: GenerateRequest): Promise<GenerateResponse>;
  refine(body: RefineRequest): Promise<RefineResponse>;
  decline(body: DeclineRequest): Promise<DeclineResponse>;
}

export const fetchTransport: AiTransport = {
  generate: (body) => post<GenerateResponse>("/api/generate", body.provider, body),
  refine: (body) => post<RefineResponse>("/api/refine", body.provider, body),
  decline: (body) => post<DeclineResponse>("/api/decline", body.provider, body),
};

export async function testConnection(provider: ProviderId): Promise<TestResponse> {
  return post<TestResponse>("/api/ai/test", provider, { provider });
}

export async function fetchAiStatus(): Promise<AiStatusResponse | undefined> {
  try {
    const response = await fetch("/api/ai/status", { cache: "no-store" });
    return response.ok ? ((await response.json()) as AiStatusResponse) : undefined;
  } catch {
    return undefined;
  }
}
