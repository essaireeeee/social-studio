/**
 * Pilote OpenAI. API Responses avec sortie structurée native (`text.format`),
 * `store: false` pour que rien ne soit conservé chez le fournisseur.
 * Aucun modèle par défaut : sans `OPENAI_MODEL` ni modèle saisi, le fournisseur est
 * « Non configuré » (le nom des modèles OpenAI change trop souvent pour en figer un).
 */
import OpenAI, {
  APIConnectionError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
} from "openai";
import { zodTextFormat } from "openai/helpers/zod";
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

function client(ctx: KeyContext): OpenAI {
  return new OpenAI({
    apiKey: ctx.apiKey,
    maxRetries: 0,
    timeout: ctx.timeoutMs,
    logLevel: "off",
  });
}

function toAiError(error: unknown, ctx: KeyContext, signal: AbortSignal): AiError {
  if (error instanceof AiError) return error;
  const detail = redact(error instanceof Error ? error.message : String(error), [ctx.apiKey]);
  if (error instanceof APIConnectionTimeoutError) return timeoutError(ctx);
  if (error instanceof APIUserAbortError) return abortError(signal, ctx);
  if (error instanceof APIConnectionError) return networkError(detail);
  if (error instanceof APIError) {
    return statusError(error.status, redact(providerDetail(error), [ctx.apiKey]), ctx);
  }
  if (signal.aborted) return abortError(signal, ctx);
  return unexpectedError(detail);
}

export const openaiDriver: ProviderDriver = {
  id: "openai",
  label: "OpenAI",

  async complete(request, ctx, signal) {
    try {
      const response = await client(ctx).responses.create(
        {
          model: ctx.model!,
          instructions: request.system,
          input: request.user,
          max_output_tokens: request.maxTokens,
          text: { format: zodTextFormat(request.schema, request.formatName) },
          store: false,
        },
        { signal },
      );
      const refused = response.output.some(
        (item) => item.type === "message" && item.content.some((part) => part.type === "refusal"),
      );
      if (refused) throw refusalError();
      if (response.status === "incomplete") throw truncatedError();
      return response.output_text;
    } catch (error) {
      throw toAiError(error, ctx, signal);
    }
  },

  async ping(ctx, signal) {
    try {
      const info = await client(ctx).models.retrieve(ctx.model!, { signal });
      return { model: info.id };
    } catch (error) {
      throw toAiError(error, ctx, signal);
    }
  },
};
