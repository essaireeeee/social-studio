/**
 * Logique des routes IA (section 11.2), séparée des fichiers `route.ts` pour être testée
 * sans serveur. Code serveur. Rien n'est conservé : chaque appel lit sa requête, appelle
 * le fournisseur, post-traite la sortie et répond.
 *
 * Toute erreur (clé absente, réseau, 4xx, 5xx, sortie illisible après une nouvelle
 * tentative) donne `{ fallback: true, reason }` : le client lance alors le moteur natif.
 */
import type { PostProcessResult } from "@/lib/generation/post-process";
import { EngineSchema, type Engine, type Platform, type VariantKind } from "@/types/domain";
import { unexpectedError } from "./errors";
import { clientKeysAllowed, envStatus, redact, resolveKeyContext, safeLog, type Env } from "./keys";
import { processAiText, type AiPostProcessContext } from "./post-process";
import {
  buildDeclinePrompt,
  buildGenerateSystem,
  buildGenerateUser,
  buildRefinePrompt,
} from "./prompts";
import { getAdapter, getDriver, PROVIDER_IDS } from "./registry";
import {
  DeclineRequestSchema,
  GenerateRequestSchema,
  RefineRequestSchema,
  TestRequestSchema,
} from "./schema";
import {
  AiError,
  type AiErrorCode,
  type AIProviderAdapter,
  type ConnectionTest,
  type KeyContext,
  type ProviderId,
} from "./types";

export interface AiFallback {
  fallback: true;
  reason: string;
  code: AiErrorCode | "invalid_request";
}

interface AiSuccess {
  fallback: false;
  provider: ProviderId;
  model: string;
  durationMs: number;
}

export interface AiVariantResult extends PostProcessResult {
  kind: VariantKind;
  hook: string;
  usedFacts: string[];
}

export type GenerateResponse = AiFallback | (AiSuccess & { variants: AiVariantResult[] });
export type RefineResponse = AiFallback | (AiSuccess & { result: PostProcessResult });
export type DeclineResponse =
  AiFallback | (AiSuccess & { versions: Partial<Record<Platform, PostProcessResult>> });

export interface ServiceResult<T> {
  status: number;
  body: T;
}

const invalid = (reason: string): ServiceResult<AiFallback> => ({
  status: 400,
  body: { fallback: true, reason, code: "invalid_request" },
});

type Outcome<T> =
  { ok: true; value: T; ctx: KeyContext; durationMs: number } | { ok: false; failure: AiFallback };

/** Résout la clé, borne l'appel par `AI_TIMEOUT_MS` et convertit toute erreur en bascule. */
async function callProvider<T>(
  provider: ProviderId,
  headers: Headers,
  outer: AbortSignal | undefined,
  event: string,
  run: (adapter: AIProviderAdapter, ctx: KeyContext, signal: AbortSignal) => Promise<T>,
): Promise<Outcome<T>> {
  const adapter = getAdapter(provider);
  const ctx = resolveKeyContext(provider, headers, {
    defaultModel: getDriver(provider).defaultModel,
  });
  if (!adapter.isConfigured(ctx)) {
    const reason = ctx.apiKey
      ? `aucun modèle ${adapter.label} défini`
      : `aucune clé ${adapter.label} configurée`;
    return { ok: false, failure: { fallback: true, reason, code: "not_configured" } };
  }
  const timeout = AbortSignal.timeout(ctx.timeoutMs);
  const signal = outer ? AbortSignal.any([outer, timeout]) : timeout;
  const started = performance.now();
  try {
    const value = await run(adapter, ctx, signal);
    const durationMs = Math.round(performance.now() - started);
    return { ok: true, value, ctx, durationMs };
  } catch (error) {
    const aiError =
      error instanceof AiError
        ? error
        : unexpectedError(
            redact(error instanceof Error ? error.message : String(error), [ctx.apiKey]),
          );
    safeLog("warn", `${event}.fallback`, {
      provider,
      model: ctx.model,
      code: aiError.code,
      status: aiError.status,
      durationMs: Math.round(performance.now() - started),
    });
    return {
      ok: false,
      failure: {
        fallback: true,
        reason: redact(aiError.message, [ctx.apiKey]),
        code: aiError.code,
      },
    };
  }
}

function postContext(
  request: Omit<AiPostProcessContext, "platform" | "references"> & {
    references?: AiPostProcessContext["references"];
  },
  platform: Platform,
): AiPostProcessContext {
  return { ...request, references: request.references ?? [], platform };
}

export async function runGenerate(
  body: unknown,
  headers: Headers,
  signal?: AbortSignal,
): Promise<ServiceResult<GenerateResponse>> {
  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) return invalid("requête de génération invalide");
  const request = parsed.data;
  let prompt: { system: string; user: string };
  try {
    prompt = { system: buildGenerateSystem(request), user: buildGenerateUser(request) };
  } catch (error) {
    return invalid(error instanceof Error ? error.message : "brief invalide");
  }

  const outcome = await callProvider(
    request.provider,
    headers,
    signal,
    "generate",
    (adapter, ctx, s) => adapter.generate(prompt, ctx, s),
  );
  if (!outcome.ok) return { status: 200, body: outcome.failure };

  const context = postContext(request, request.platform);
  const variants = outcome.value.map((variant): AiVariantResult => {
    const processed = processAiText(variant.text, context);
    return {
      ...processed,
      kind: variant.kind,
      hook: processed.text.split("\n")[0] ?? "",
      usedFacts: variant.usedFacts,
    };
  });
  return {
    status: 200,
    body: {
      fallback: false,
      provider: request.provider,
      model: outcome.ctx.model!,
      durationMs: outcome.durationMs,
      variants,
    },
  };
}

export async function runRefine(
  body: unknown,
  headers: Headers,
  signal?: AbortSignal,
): Promise<ServiceResult<RefineResponse>> {
  const parsed = RefineRequestSchema.safeParse(body);
  if (!parsed.success) return invalid("requête de retouche invalide");
  const request = parsed.data;
  if (request.action === "custom" && !request.instruction?.trim()) {
    return invalid("consigne libre vide");
  }
  let prompt: { system: string; user: string };
  try {
    prompt = buildRefinePrompt(request);
  } catch (error) {
    return invalid(error instanceof Error ? error.message : "brief invalide");
  }

  const outcome = await callProvider(
    request.provider,
    headers,
    signal,
    "refine",
    (adapter, ctx, s) =>
      adapter.refine(
        { ...prompt, hookOnlyOf: request.action === "new_hook" ? request.text : undefined },
        ctx,
        s,
      ),
  );
  if (!outcome.ok) return { status: 200, body: outcome.failure };
  return {
    status: 200,
    body: {
      fallback: false,
      provider: request.provider,
      model: outcome.ctx.model!,
      durationMs: outcome.durationMs,
      result: processAiText(outcome.value, postContext(request, request.brief.platform)),
    },
  };
}

export async function runDecline(
  body: unknown,
  headers: Headers,
  signal?: AbortSignal,
): Promise<ServiceResult<DeclineResponse>> {
  const parsed = DeclineRequestSchema.safeParse(body);
  if (!parsed.success) return invalid("requête de déclinaison invalide");
  const request = parsed.data;
  const targets = request.targets.filter((p) => p !== request.brief.platform);
  if (targets.length === 0) return invalid("aucune autre plateforme demandée");
  let prompt: { system: string; user: string };
  try {
    prompt = buildDeclinePrompt({ ...request, targets });
  } catch (error) {
    return invalid(error instanceof Error ? error.message : "brief invalide");
  }

  const outcome = await callProvider(
    request.provider,
    headers,
    signal,
    "decline",
    (adapter, ctx, s) => adapter.decline({ ...prompt, targets }, ctx, s),
  );
  if (!outcome.ok) return { status: 200, body: outcome.failure };
  const versions: Partial<Record<Platform, PostProcessResult>> = {};
  for (const [platform, text] of Object.entries(outcome.value) as [Platform, string][]) {
    versions[platform] = processAiText(text, postContext(request, platform));
  }
  return {
    status: 200,
    body: {
      fallback: false,
      provider: request.provider,
      model: outcome.ctx.model!,
      durationMs: outcome.durationMs,
      versions,
    },
  };
}

export type TestResponse =
  (ConnectionTest & Pick<KeyContext, "keySource" | "modelSource">) | AiFallback;

export async function runTest(
  body: unknown,
  headers: Headers,
): Promise<ServiceResult<TestResponse>> {
  const parsed = TestRequestSchema.safeParse(body);
  if (!parsed.success) return invalid("fournisseur inconnu");
  const { provider } = parsed.data;
  const ctx = resolveKeyContext(provider, headers, {
    defaultModel: getDriver(provider).defaultModel,
  });
  const result = await getAdapter(provider).test(ctx);
  if (!result.ok) {
    safeLog("warn", "test.failed", {
      provider,
      latencyMs: result.latencyMs,
      origin: ctx.keySource,
    });
  }
  return {
    status: 200,
    body: { ...result, keySource: ctx.keySource, modelSource: ctx.modelSource },
  };
}

export interface ProviderStatus {
  id: ProviderId;
  label: string;
  keyInEnv: boolean;
  /** Modèle défini en .env : il s'impose et n'est pas modifiable dans l'interface. */
  modelInEnv?: string;
  defaultModel?: string;
}

export interface AiStatusResponse {
  clientKeysAllowed: boolean;
  /** Moteur initial (`AI_PROVIDER`), appliqué au premier lancement. */
  defaultEngine: Engine;
  providers: ProviderStatus[];
}

/** État des fournisseurs côté serveur, sans aucune clé (écran Paramètres). */
export function aiStatus(env: Env = process.env): AiStatusResponse {
  const engine = EngineSchema.safeParse(env.AI_PROVIDER?.trim());
  return {
    clientKeysAllowed: clientKeysAllowed(env),
    defaultEngine: engine.success ? engine.data : "native",
    providers: PROVIDER_IDS.map((id) => {
      const driver = getDriver(id);
      const status = envStatus(id, env);
      return {
        id,
        label: driver.label,
        keyInEnv: status.keyInEnv,
        modelInEnv: status.modelInEnv,
        defaultModel: driver.defaultModel,
      };
    }),
  };
}
