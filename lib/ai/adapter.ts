/**
 * Fabrique d'adaptateurs (section 11.1) : à partir d'un pilote qui sait envoyer une
 * requête, construit generate / refine / decline / test avec la validation Zod, une
 * nouvelle tentative si la sortie est illisible, et le contrôle de l'action `new_hook`.
 */
import type { z } from "zod";
import type { Platform } from "@/types/domain";
import { redact } from "./keys";
import {
  DeclineOutputSchema,
  RefineOutputSchema,
  VariantsOutputSchema,
  VariantsWireSchema,
} from "./schema";
import {
  AiError,
  type AIProviderAdapter,
  type CompletionRequest,
  type KeyContext,
  type ProviderDriver,
} from "./types";

/** Une sortie illisible déclenche une seule nouvelle tentative (section 11.2). */
const ATTEMPTS = 2;

/** Texte JSON d'une réponse : sans clôture Markdown ni texte autour de l'objet. */
export function extractJson(raw: string): string {
  const unfenced = raw.replace(/^\s*```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "");
  const start = unfenced.indexOf("{");
  const end = unfenced.lastIndexOf("}");
  return start === -1 || end < start ? unfenced : unfenced.slice(start, end + 1);
}

/** Corps du texte sans sa première ligne non vide, espaces de fin ignorés. */
export function bodyAfterHook(text: string): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const first = lines.findIndex((line) => line.trim() !== "");
  return lines
    .slice(first + 1)
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

export function createAdapter(driver: ProviderDriver): AIProviderAdapter {
  const isConfigured = (ctx: KeyContext) => Boolean(ctx.apiKey && ctx.model);

  async function completeValid<W, T>(
    request: CompletionRequest<W>,
    validator: z.ZodType<T>,
    ctx: KeyContext,
    signal: AbortSignal,
    check?: (value: T) => void,
  ): Promise<T> {
    if (!isConfigured(ctx)) {
      throw new AiError("not_configured", `aucune clé ${driver.label} configurée`);
    }
    let last: AiError | undefined;
    for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
      try {
        const raw = await driver.complete(request, ctx, signal);
        const parsed = validator.safeParse(JSON.parse(extractJson(raw)));
        if (!parsed.success) {
          throw new AiError("invalid_output", "réponse illisible (format inattendu)");
        }
        check?.(parsed.data);
        return parsed.data;
      } catch (error) {
        if (error instanceof SyntaxError) {
          last = new AiError("invalid_output", "réponse illisible (JSON invalide)");
        } else if (
          error instanceof AiError &&
          (error.code === "invalid_output" || error.code === "hook_only_violation")
        ) {
          last = error;
        } else {
          throw error;
        }
      }
    }
    throw last ?? new AiError("invalid_output", "réponse illisible");
  }

  return {
    id: driver.id,
    label: driver.label,
    isConfigured,

    async generate(input, ctx, signal) {
      const output = await completeValid(
        {
          system: input.system,
          user: input.user,
          formatName: "hexagone_variants",
          schema: VariantsWireSchema,
          maxTokens: 16_000,
          effort: "medium",
        },
        VariantsOutputSchema,
        ctx,
        signal,
      );
      return output.variants;
    },

    async refine(input, ctx, signal) {
      const output = await completeValid(
        {
          system: input.system,
          user: input.user,
          formatName: "hexagone_refine",
          schema: RefineOutputSchema,
          maxTokens: 8_000,
          effort: "low",
        },
        RefineOutputSchema,
        ctx,
        signal,
        (value) => {
          if (
            input.hookOnlyOf !== undefined &&
            bodyAfterHook(value.text) !== bodyAfterHook(input.hookOnlyOf)
          ) {
            throw new AiError(
              "hook_only_violation",
              "le modèle a modifié autre chose que l'accroche",
            );
          }
        },
      );
      return output.text;
    },

    async decline(input, ctx, signal) {
      const output = await completeValid(
        {
          system: input.system,
          user: input.user,
          formatName: "hexagone_declinations",
          schema: DeclineOutputSchema,
          maxTokens: 8_000,
          effort: "low",
        },
        DeclineOutputSchema,
        ctx,
        signal,
      );
      const versions: Partial<Record<Platform, string>> = {};
      for (const version of output.versions) {
        if (input.targets.includes(version.platform) && version.text.trim()) {
          versions[version.platform] = version.text;
        }
      }
      return versions;
    },

    async test(ctx) {
      const model = ctx.model ?? "";
      if (!isConfigured(ctx)) {
        return {
          ok: false,
          latencyMs: 0,
          model,
          error: ctx.apiKey ? "aucun modèle défini" : `aucune clé ${driver.label} configurée`,
        };
      }
      const started = performance.now();
      try {
        const result = await driver.ping(ctx, AbortSignal.timeout(ctx.timeoutMs));
        return {
          ok: true,
          latencyMs: Math.round(performance.now() - started),
          model: result.model,
        };
      } catch (error) {
        const message =
          error instanceof AiError ? error.fullMessage : "erreur inattendue du fournisseur";
        return {
          ok: false,
          latencyMs: Math.round(performance.now() - started),
          model,
          error: redact(message, [ctx.apiKey]),
        };
      }
    },
  };
}
