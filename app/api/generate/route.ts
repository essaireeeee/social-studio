import { readJsonBody, reply } from "@/lib/ai/http";
import { runGenerate } from "@/lib/ai/service";

/**
 * Génération IA (section 11.2) : trois variantes post-traitées, ou `{ fallback: true, reason }`
 * pour que le client bascule sur le moteur natif. Clé : .env.local, sinon `x-hex-provider-key`.
 */
export async function POST(request: Request): Promise<Response> {
  const { status, body } = await runGenerate(
    await readJsonBody(request),
    request.headers,
    request.signal,
  );
  return reply(body, status);
}
