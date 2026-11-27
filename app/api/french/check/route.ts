import { readJsonBody, reply } from "@/lib/ai/http";
import { envStatus } from "@/lib/ai/keys";
import {
  FrenchCheckRequestSchema,
  type FrenchCheckResponse,
  type FrenchStatusResponse,
} from "@/lib/french/remote";
import {
  checkWithLanguageTool,
  languageToolUrl,
  probeLanguageTool,
  reviewWithAi,
} from "@/lib/french/remote.server";

/**
 * Couches 2 et 3 de l'Atelier Français (section 6.1). Jamais bloquant : une couche absente
 * ou muette renvoie un statut, pas une erreur. Le texte n'est pas journalisé.
 * GET : état des couches ; `?probe=languagetool` : test réel (bouton « Tester »).
 */
export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  if (url.searchParams.get("probe") === "languagetool") return reply(await probeLanguageTool());
  const status: FrenchStatusResponse = {
    languagetool: { configured: Boolean(languageToolUrl()) },
    ai: {
      anthropic: envStatus("anthropic").keyInEnv,
      openai: envStatus("openai").keyInEnv,
    },
  };
  return reply(status);
}

export async function POST(request: Request): Promise<Response> {
  const parsed = FrenchCheckRequestSchema.safeParse(await readJsonBody(request));
  if (!parsed.success)
    return reply({ error: "invalid_request", message: "Requête de correction invalide." }, 400);
  const { text, layers, provider } = parsed.data;
  const [languagetool, ai] = await Promise.all([
    layers.includes("languagetool") ? checkWithLanguageTool(text, request.signal) : undefined,
    layers.includes("ai")
      ? provider
        ? reviewWithAi(text, provider, request.headers, request.signal)
        : Promise.resolve({
            status: "disabled" as const,
            issues: [],
            message: "moteur natif sélectionné",
          })
      : undefined,
  ]);
  const body: FrenchCheckResponse = { languagetool, ai };
  return reply(body);
}
