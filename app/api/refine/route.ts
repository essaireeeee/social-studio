import { readJsonBody, reply } from "@/lib/ai/http";
import { runRefine } from "@/lib/ai/service";

/** Retouche IA d'une variante (section 11.4). `new_hook` : seule la première ligne change. */
export async function POST(request: Request): Promise<Response> {
  const { status, body } = await runRefine(
    await readJsonBody(request),
    request.headers,
    request.signal,
  );
  return reply(body, status);
}
