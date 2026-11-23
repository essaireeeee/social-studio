/**
 * Motifs d'erreur communs aux fournisseurs (section 11.2) : courts, en français, sans
 * secret. Chaque pilote traduit les exceptions typées de son SDK vers ces constructeurs.
 */
import { AiError, type KeyContext } from "./types";

export function statusError(status: number | undefined, detail: string, ctx: KeyContext): AiError {
  switch (status) {
    case 400:
      return new AiError("bad_request", "requête refusée par le fournisseur (400)", 400, detail);
    case 401:
      return new AiError("auth", "clé refusée par le fournisseur (401)", 401, detail);
    case 402:
      return new AiError("provider", "compte du fournisseur à créditer (402)", 402, detail);
    case 403:
      return new AiError("forbidden", "accès refusé par le fournisseur (403)", 403, detail);
    case 404:
      return new AiError(
        "not_found",
        `modèle introuvable : ${ctx.model ?? "?"} (404)`,
        404,
        detail,
      );
    case 408:
      return new AiError("timeout", "délai dépassé chez le fournisseur (408)", 408, detail);
    case 429:
      return new AiError("rate_limit", "limite de requêtes atteinte (429)", 429, detail);
    default:
      if (status !== undefined && status >= 500) {
        return new AiError("provider", `fournisseur indisponible (${status})`, status, detail);
      }
      return new AiError("provider", `erreur du fournisseur (${status ?? "?"})`, status, detail);
  }
}

/**
 * Message lisible d'une erreur HTTP du fournisseur : celui du corps JSON s'il existe
 * (Anthropic : `{ error: { message } }`, OpenAI : `{ message }`), sinon celui du SDK.
 */
export function providerDetail(error: Error & { error?: unknown }): string {
  const body = error.error as { error?: { message?: unknown }; message?: unknown } | undefined;
  if (typeof body?.error?.message === "string") return body.error.message;
  if (typeof body?.message === "string") return body.message;
  return error.message;
}

export function timeoutError(ctx: KeyContext): AiError {
  return new AiError("timeout", `délai dépassé (${Math.round(ctx.timeoutMs / 1000)} s)`);
}

/** Requête annulée : délai dépassé, ou fermeture de la page par le CM. */
export function abortError(signal: AbortSignal, ctx: KeyContext): AiError {
  const reason: unknown = signal.reason;
  const isTimeout = reason instanceof DOMException && reason.name === "TimeoutError";
  return isTimeout ? timeoutError(ctx) : new AiError("network", "requête interrompue");
}

export function networkError(detail: string): AiError {
  return new AiError("network", "erreur réseau : fournisseur injoignable", undefined, detail);
}

export function unexpectedError(detail: string): AiError {
  return new AiError("provider", "erreur inattendue du fournisseur", undefined, detail);
}

export const truncatedError = () =>
  new AiError("invalid_output", "réponse tronquée (limite de longueur atteinte)");

export const refusalError = () => new AiError("refusal", "demande refusée par le modèle");
