/**
 * Interface commune des fournisseurs IA (section 11.1). Code serveur uniquement :
 * les clés ne quittent jamais les routes Next.js.
 *
 * Un fournisseur se branche en deux temps : un pilote (`ProviderDriver`) qui sait envoyer
 * une requête et vérifier la connexion, puis `createAdapter` (adapter.ts) qui en tire
 * l'adaptateur complet. Ajouter un fournisseur = un fichier + une ligne dans registry.ts.
 */
import type { z } from "zod";
import type { Engine, Platform, VariantKind } from "@/types/domain";

/** Fournisseurs IA : tous les moteurs sauf le natif (`EngineSchema`, types/domain.ts). */
export type ProviderId = Exclude<Engine, "native">;

/** Clé et modèle résolus pour une requête. La clé n'est jamais renvoyée ni journalisée. */
export interface KeyContext {
  provider: ProviderId;
  apiKey?: string;
  /** `env` : `.env.local` ; `session` : en-tête `x-hex-provider-key` ; `none` : aucune. */
  keySource: "env" | "session" | "none";
  model?: string;
  modelSource: "env" | "session" | "default" | "none";
  timeoutMs: number;
}

/** Requête neutre envoyée à un pilote : prompt système, message, format de sortie. */
export interface CompletionRequest<T> {
  system: string;
  user: string;
  /** Nom du format (OpenAI l'exige). */
  formatName: string;
  schema: z.ZodType<T>;
  maxTokens: number;
  /** Profondeur de réflexion demandée, quand le fournisseur la prend en charge. */
  effort: "low" | "medium";
}

export interface ProviderDriver {
  id: ProviderId;
  label: string;
  /** Modèle utilisé si aucun n'est défini en .env ni dans l'interface. */
  defaultModel?: string;
  /** Renvoie le texte JSON brut produit par le modèle (sortie structurée native). */
  complete<T>(request: CompletionRequest<T>, ctx: KeyContext, signal: AbortSignal): Promise<string>;
  /** Vrai appel minimal : vérifie la clé et le modèle. */
  ping(ctx: KeyContext, signal: AbortSignal): Promise<{ model: string }>;
}

// ---------------------------------------------------------------------------
// Entrées et sorties de l'adaptateur
// ---------------------------------------------------------------------------

/** Prompt déjà construit par prompts.ts : l'adaptateur ne connaît pas le métier. */
export interface GenerationInput {
  system: string;
  user: string;
}

export interface RawVariant {
  kind: VariantKind;
  hook: string;
  text: string;
  usedFacts: string[];
}

/** Trois variantes, une par type, validées par le schéma (lib/ai/schema.ts). */
export type RawVariants = RawVariant[];

export interface RefineInput {
  system: string;
  user: string;
  /** Action `new_hook` : le reste du texte doit rester identique (vérifié par l'adaptateur). */
  hookOnlyOf?: string;
}

export interface DeclineInput {
  system: string;
  user: string;
  targets: readonly Platform[];
}

export interface ConnectionTest {
  ok: boolean;
  latencyMs: number;
  model: string;
  error?: string;
}

export interface AIProviderAdapter {
  id: ProviderId;
  label: string;
  isConfigured(ctx: KeyContext): boolean;
  generate(input: GenerationInput, ctx: KeyContext, signal: AbortSignal): Promise<RawVariants>;
  refine(input: RefineInput, ctx: KeyContext, signal: AbortSignal): Promise<string>;
  decline(
    input: DeclineInput,
    ctx: KeyContext,
    signal: AbortSignal,
  ): Promise<Partial<Record<Platform, string>>>;
  test(ctx: KeyContext): Promise<ConnectionTest>;
}

// ---------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------

export type AiErrorCode =
  | "not_configured"
  | "auth"
  | "forbidden"
  | "not_found"
  | "rate_limit"
  | "provider"
  | "bad_request"
  | "timeout"
  | "network"
  | "invalid_output"
  | "refusal"
  | "hook_only_violation";

/**
 * Erreur d'un fournisseur. `message` : motif court en français (affiché lors de la bascule
 * vers le moteur natif) ; `detail` : message exact du fournisseur, déjà masqué.
 */
export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode,
    message: string,
    readonly status?: number,
    readonly detail?: string,
  ) {
    super(message);
    this.name = "AiError";
  }

  /** Motif complet : le message et, s'il apporte quelque chose, le détail du fournisseur. */
  get fullMessage(): string {
    return this.detail && this.detail !== this.message
      ? `${this.message} : ${this.detail}`
      : this.message;
  }
}
