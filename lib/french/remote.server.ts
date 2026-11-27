/**
 * Couches distantes de l'Atelier Français, côté serveur uniquement.
 * - LanguageTool auto-hébergé (`LANGUAGETOOL_URL`), timeout 8 s, ignoré s'il ne répond pas.
 * - Relecture IA : mêmes pilotes et mêmes clés que la génération (règle 1.5), sortie JSON
 *   validée, corrections qui changent plus de 3 mots consécutifs rejetées.
 * Le texte n'est jamais journalisé.
 */
import { getAdapter, getDriver } from "@/lib/ai/registry";
import { redact, resolveKeyContext, safeLog, type Env } from "@/lib/ai/keys";
import type { ProviderId } from "@/lib/ai/types";
import { extractJson } from "@/lib/ai/adapter";
import {
  AiReviewSchema,
  fromLanguageTool,
  placeAiErrors,
  type FrenchProbeResponse,
  type LanguageToolMatch,
  type LayerResult,
} from "./remote";

const LANGUAGETOOL_TIMEOUT_MS = 8_000;

export function languageToolUrl(env: Env = process.env): string | undefined {
  const raw = env.LANGUAGETOOL_URL?.trim();
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString().replace(/\/$/, "")
      : undefined;
  } catch {
    return undefined;
  }
}

async function callLanguageTool(
  base: string,
  text: string,
  signal?: AbortSignal,
): Promise<LanguageToolMatch[]> {
  const timeout = AbortSignal.timeout(LANGUAGETOOL_TIMEOUT_MS);
  const response = await fetch(`${base}/v2/check`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" },
    body: new URLSearchParams({ text, language: "fr" }),
    signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`LanguageTool a répondu ${response.status}`);
  const body = (await response.json()) as { matches?: LanguageToolMatch[] };
  return Array.isArray(body.matches) ? body.matches : [];
}

export async function checkWithLanguageTool(
  text: string,
  signal?: AbortSignal,
  env: Env = process.env,
): Promise<LayerResult> {
  const base = languageToolUrl(env);
  if (!base) return { status: "disabled", issues: [], message: "LANGUAGETOOL_URL non défini" };
  try {
    const matches = await callLanguageTool(base, text, signal);
    return { status: "ok", issues: fromLanguageTool(text, matches) };
  } catch (error) {
    safeLog("warn", "french.languagetool.unavailable", {
      reason: error instanceof Error ? error.name : "inconnu",
    });
    return { status: "unavailable", issues: [], message: "LanguageTool ne répond pas" };
  }
}

/** Bouton « Tester » : un vrai appel sur une phrase courte. */
export async function probeLanguageTool(env: Env = process.env): Promise<FrenchProbeResponse> {
  const base = languageToolUrl(env);
  if (!base) return { ok: false, message: "LANGUAGETOOL_URL n'est pas défini dans .env.local." };
  const started = performance.now();
  try {
    await callLanguageTool(base, "Il à gagné par KO.");
    const durationMs = Math.round(performance.now() - started);
    return { ok: true, durationMs, message: `LanguageTool répond (${durationMs} ms).` };
  } catch {
    return { ok: false, message: "LanguageTool ne répond pas à l'adresse configurée." };
  }
}

export const AI_REVIEW_SYSTEM = [
  "Tu es correcteur pour une ligue de MMA française.",
  "Corrige uniquement les fautes. Ne reformule pas, ne change pas le style, ne touche pas aux noms propres, hashtags, emojis, mentions, liens.",
  "Respecte la règle maison : « de HEXAGONE MMA », jamais « d'HEXAGONE MMA » (sauf « la ceinture d'HEXAGONE MMA »).",
  "Réponds en JSON : liste d'erreurs avec position, extrait, correction, règle.",
  'Format exact : {"errors":[{"excerpt":"passage fautif tel qu\'écrit","correction":"passage corrigé","rule":"règle en quelques mots"}]}. Liste vide si le texte est correct.',
].join("\n");

export async function reviewWithAi(
  text: string,
  provider: ProviderId,
  headers: Headers,
  signal?: AbortSignal,
): Promise<LayerResult> {
  const adapter = getAdapter(provider);
  const ctx = resolveKeyContext(provider, headers, {
    defaultModel: getDriver(provider).defaultModel,
  });
  if (!adapter.isConfigured(ctx))
    return { status: "disabled", issues: [], message: `${adapter.label} n'est pas configuré` };
  const timeout = AbortSignal.timeout(ctx.timeoutMs);
  try {
    const raw = await getDriver(provider).complete(
      {
        system: AI_REVIEW_SYSTEM,
        user: `Texte à corriger :\n<<<\n${text}\n>>>`,
        formatName: "french_review",
        schema: AiReviewSchema,
        maxTokens: 2_000,
        effort: "low",
      },
      ctx,
      signal ? AbortSignal.any([signal, timeout]) : timeout,
    );
    const parsed = AiReviewSchema.safeParse(JSON.parse(extractJson(raw)));
    if (!parsed.success)
      return { status: "unavailable", issues: [], message: "réponse IA illisible" };
    return { status: "ok", issues: placeAiErrors(text, parsed.data) };
  } catch (error) {
    safeLog("warn", "french.ai.unavailable", {
      provider,
      reason: redact(error instanceof Error ? error.name : "inconnu", [ctx.apiKey]),
    });
    return { status: "unavailable", issues: [], message: "relecture IA indisponible" };
  }
}
