/**
 * Appels du navigateur vers `/api/french/check` (couches 2 et 3). Jamais bloquant :
 * une erreur réseau rend « indisponible », la couche locale reste affichée.
 */
import { headersFor } from "@/lib/generation/ai-client";
import type { Engine } from "@/types/domain";
import type {
  FrenchCheckResponse,
  FrenchProbeResponse,
  FrenchStatusResponse,
  LayerResult,
  RemoteLayer,
} from "./remote";
import type { FrenchPrefs } from "./types";

export interface RemoteOutcome {
  languagetool?: LayerResult;
  ai?: LayerResult;
}

/** Couches distantes demandées pour un texte, selon les réglages et le moteur IA. */
export function remoteLayers(prefs: FrenchPrefs, engine: Engine): RemoteLayer[] {
  const layers: RemoteLayer[] = [];
  if (prefs.layers.languagetool) layers.push("languagetool");
  if (prefs.layers.ai && engine !== "native") layers.push("ai");
  return layers;
}

export async function checkRemote(
  text: string,
  layers: readonly RemoteLayer[],
  engine: Engine,
  signal?: AbortSignal,
): Promise<RemoteOutcome> {
  if (layers.length === 0 || !text.trim()) return {};
  const provider = engine === "native" ? undefined : engine;
  try {
    const response = await fetch("/api/french/check", {
      method: "POST",
      headers: provider ? headersFor(provider) : { "Content-Type": "application/json" },
      body: JSON.stringify({ text, layers, provider }),
      signal,
      cache: "no-store",
    });
    if (!response.ok) throw new Error(String(response.status));
    return (await response.json()) as FrenchCheckResponse;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    const unavailable: LayerResult = {
      status: "unavailable",
      issues: [],
      message: "serveur local injoignable",
    };
    return {
      languagetool: layers.includes("languagetool") ? unavailable : undefined,
      ai: layers.includes("ai") ? unavailable : undefined,
    };
  }
}

export async function fetchFrenchStatus(): Promise<FrenchStatusResponse | undefined> {
  try {
    const response = await fetch("/api/french/check", { cache: "no-store" });
    return response.ok ? ((await response.json()) as FrenchStatusResponse) : undefined;
  } catch {
    return undefined;
  }
}

export async function probeLanguageToolFromClient(): Promise<FrenchProbeResponse> {
  try {
    const response = await fetch("/api/french/check?probe=languagetool", { cache: "no-store" });
    return (await response.json()) as FrenchProbeResponse;
  } catch {
    return { ok: false, message: "Serveur local injoignable." };
  }
}
