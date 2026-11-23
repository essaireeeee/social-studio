/**
 * État affiché d'un fournisseur IA (section 11.5), calculé côté client à partir de ce que
 * le serveur déclare (`/api/ai/status`) et de la clé de session éventuelle. Logique pure.
 */
import type { Engine } from "@/types/domain";
import type { ProviderStatus } from "./service";

export type KeySource = "env" | "session" | "none";
export type ProviderHealth = "unknown" | "ok" | "error";

export interface ProviderView {
  keySource: KeySource;
  /** Modèle effectivement utilisé : .env, sinon saisi, sinon défaut du fournisseur. */
  model?: string;
  modelSource: "env" | "session" | "default" | "none";
  configured: boolean;
}

export const KEY_SOURCE_LABELS: Record<KeySource, string> = {
  env: "Configuré via .env",
  session: "Clé de session",
  none: "Non configuré",
};

export const ENGINE_SHORT_LABELS: Record<Engine, string> = {
  native: "Natif",
  anthropic: "Claude",
  openai: "OpenAI",
};

export function providerView(
  status: ProviderStatus,
  session: { key?: string; model?: string },
  clientKeysAllowed: boolean,
): ProviderView {
  const sessionKey = clientKeysAllowed ? session.key : undefined;
  const sessionModel = clientKeysAllowed ? session.model : undefined;
  const keySource: KeySource = status.keyInEnv ? "env" : sessionKey ? "session" : "none";
  const model = status.modelInEnv ?? sessionModel ?? status.defaultModel;
  const modelSource = status.modelInEnv
    ? "env"
    : sessionModel
      ? "session"
      : status.defaultModel
        ? "default"
        : "none";
  return { keySource, model, modelSource, configured: keySource !== "none" && Boolean(model) };
}

/** Texte de l'indicateur : « Natif », « Claude · connecté », « OpenAI · erreur »... */
export function engineIndicator(
  engine: Engine,
  view: ProviderView | undefined,
  health: ProviderHealth,
): { text: string; tone: "neutral" | "success" | "danger" | "warning" } {
  if (engine === "native") return { text: "Natif", tone: "neutral" };
  const name = ENGINE_SHORT_LABELS[engine];
  if (!view?.configured) return { text: `${name} · non configuré`, tone: "warning" };
  if (health === "ok") return { text: `${name} · connecté`, tone: "success" };
  if (health === "error") return { text: `${name} · erreur`, tone: "danger" };
  return { text: `${name} · non testé`, tone: "neutral" };
}
