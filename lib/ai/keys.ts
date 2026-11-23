/**
 * Résolution des clés et journalisation sans secret (section 11.2). Code serveur.
 *
 * Priorité 1 : `.env.local` (process.env). Priorité 2 : en-tête `x-hex-provider-key`,
 * accepté seulement si `NODE_ENV !== "production"` ou `ALLOW_CLIENT_KEYS=true`.
 * Le modèle suit la même règle : celui du .env s'impose à l'interface.
 */
import type { KeyContext, ProviderId } from "./types";

export const KEY_HEADER = "x-hex-provider-key";
export const MODEL_HEADER = "x-hex-provider-model";

export type Env = Readonly<Record<string, string | undefined>>;

const ENV_NAMES: Record<ProviderId, { key: string; model: string }> = {
  anthropic: { key: "ANTHROPIC_API_KEY", model: "ANTHROPIC_MODEL" },
  openai: { key: "OPENAI_API_KEY", model: "OPENAI_MODEL" },
};

const DEFAULT_TIMEOUT_MS = 30_000;
/** Clé plausible : 8 à 400 caractères visibles, sans espace. */
const KEY_SHAPE = /^[\x21-\x7E]{8,400}$/;
const MODEL_SHAPE = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,99}$/;

export function clientKeysAllowed(env: Env = process.env): boolean {
  return env.NODE_ENV !== "production" || env.ALLOW_CLIENT_KEYS === "true";
}

export function aiTimeoutMs(env: Env = process.env): number {
  const value = Number(env.AI_TIMEOUT_MS);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_TIMEOUT_MS;
  return Math.min(120_000, Math.max(1_000, Math.round(value)));
}

const clean = (value: string | null | undefined) => value?.trim() || undefined;

/** Ce que le serveur sait d'un fournisseur, sans la clé : sert à l'écran Paramètres. */
export function envStatus(provider: ProviderId, env: Env = process.env) {
  return {
    keyInEnv: Boolean(clean(env[ENV_NAMES[provider].key])),
    modelInEnv: clean(env[ENV_NAMES[provider].model]),
  };
}

export function resolveKeyContext(
  provider: ProviderId,
  headers: Headers,
  options: { env?: Env; defaultModel?: string } = {},
): KeyContext {
  const env = options.env ?? process.env;
  const allowClient = clientKeysAllowed(env);
  const envKey = clean(env[ENV_NAMES[provider].key]);
  const envModel = clean(env[ENV_NAMES[provider].model]);
  const headerKey = clean(headers.get(KEY_HEADER));
  const headerModel = clean(headers.get(MODEL_HEADER));

  const sessionKey = allowClient && headerKey && KEY_SHAPE.test(headerKey) ? headerKey : undefined;
  const sessionModel =
    allowClient && headerModel && MODEL_SHAPE.test(headerModel) ? headerModel : undefined;

  const apiKey = envKey ?? sessionKey;
  const model = envModel ?? sessionModel ?? options.defaultModel;
  return {
    provider,
    apiKey,
    keySource: envKey ? "env" : sessionKey ? "session" : "none",
    model,
    modelSource: envModel
      ? "env"
      : sessionModel
        ? "session"
        : options.defaultModel
          ? "default"
          : "none",
    timeoutMs: aiTimeoutMs(env),
  };
}

// ---------------------------------------------------------------------------
// Masquage
// ---------------------------------------------------------------------------

const MASK = "[masqué]";
/** Champs dont la valeur n'est jamais écrite : clé, jeton, en-tête d'autorisation. */
const SECRET_FIELD = /key|token|authorization|secret|password/i;
/** Formes courantes de clés et d'en-têtes, au cas où un message d'erreur les reprendrait. */
const SECRET_SHAPES = [
  /\bsk-[A-Za-z0-9_*.-]{3,}/g,
  /\bBearer\s+[^\s"']+/gi,
  /\bx-api-key\s*[:=]\s*[^\s"']+/gi,
];

/** Retire d'un texte les secrets connus et toute chaîne qui ressemble à une clé. */
export function redact(text: string, secrets: readonly (string | undefined)[] = []): string {
  let result = text;
  for (const secret of secrets) {
    if (secret && secret.length >= 4) result = result.split(secret).join(MASK);
  }
  for (const shape of SECRET_SHAPES) result = result.replace(shape, MASK);
  return result;
}

function sanitize(value: unknown, depth: number): unknown {
  if (typeof value === "string") return redact(value);
  if (value === null || typeof value !== "object") return value;
  if (depth > 5) return "[…]";
  if (value instanceof Error) return { name: value.name, message: redact(value.message) };
  if (Array.isArray(value)) return value.map((item) => sanitize(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([field, item]) => [
      field,
      SECRET_FIELD.test(field) ? MASK : sanitize(item, depth + 1),
    ]),
  );
}

/** Copie d'un objet où tout champ sensible est masqué (utilisée par `safeLog`). */
export function maskSecrets<T>(value: T): T {
  return sanitize(value, 0) as T;
}

/**
 * Seule voie de journalisation de la couche IA. N'écrit jamais d'en-tête ni de corps de
 * requête : uniquement des métadonnées (fournisseur, statut, durée, motif), masquées.
 */
export function safeLog(
  level: "warn" | "error",
  event: string,
  data: Record<string, unknown> = {},
): void {
  const line = `[hex-ai] ${redact(event)}`;
  const payload = maskSecrets(data);
  if (level === "error") console.error(line, payload);
  else console.warn(line, payload);
}
