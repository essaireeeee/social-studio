/**
 * Pilote Anthropic (Claude). Sortie structurée native (`output_config.format`),
 * aucune nouvelle tentative du SDK : le délai `AI_TIMEOUT_MS` borne tout l'appel.
 * Le modèle vient de `ANTHROPIC_MODEL`, sinon de l'interface, sinon `claude-sonnet-5-5`.
 */
import Anthropic, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
} from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import {
  abortError,
  networkError,
  providerDetail,
  refusalError,
  statusError,
  timeoutError,
  truncatedError,
  unexpectedError,
} from "../errors";
import { redact } from "../keys";
import { AiError, type KeyContext, type ProviderDriver } from "../types";

export const ANTHROPIC_DEFAULT_MODEL = "claude-sonnet-5-5";

function client(ctx: KeyContext): Anthropic {
  return new Anthropic({
    apiKey: ctx.apiKey,
    maxRetries: 0,
    timeout: ctx.timeoutMs,
    logLevel: "off",
  });
}

function toAiError(error: unknown, ctx: KeyContext, signal: AbortSignal): AiError {
  if (error instanceof AiError) return error;
  const detail = redact(error instanceof Error ? error.message : String(error), [ctx.apiKey]);
  // Du plus précis au plus général : les erreurs de connexion héritent d'APIError.
  if (error instanceof APIConnectionTimeoutError) return timeoutError(ctx);
  if (error instanceof APIUserAbortError) return abortError(signal, ctx);
  if (error instanceof APIConnectionError) return networkError(detail);
  if (error instanceof APIError) {
    return statusError(error.status, redact(providerDetail(error), [ctx.apiKey]), ctx);
  }
  if (signal.aborted) return abortError(signal, ctx);
  return unexpectedError(detail);
}

export const anthropicDriver: ProviderDriver = {
  id: "anthropic",
  label: "Claude (Anthropic)",
  defaultModel: ANTHROPIC_DEFAULT_MODEL,

  async complete(request, ctx, signal) {
    try {
      const response = await client(ctx).messages.create(
        {
          model: ctx.model!,
          max_tokens: request.maxTokens,
          system: request.system,
          messages: [{ role: "user", content: request.user }],
          output_config: { effort: request.effort, format: zodOutputFormat(request.schema) },
        },
        { signal },
      );
      if (response.stop_reason === "refusal") throw refusalError();
      if (response.stop_reason === "max_tokens") throw truncatedError();
      return response.content.map((block) => (block.type === "text" ? block.text : "")).join("");
    } catch (error) {
      throw toAiError(error, ctx, signal);
    }
  },

  async ping(ctx, signal) {
    try {
      // Vrai appel, sans génération : vérifie la clé et l'existence du modèle.
      const info = await client(ctx).models.retrieve(ctx.model!, {}, { signal });
      return { model: info.id };
    } catch (error) {
      throw toAiError(error, ctx, signal);
    }
  },
};
