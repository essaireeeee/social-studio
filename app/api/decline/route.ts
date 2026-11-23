import { readJsonBody, reply } from "@/lib/ai/http";
import { runDecline } from "@/lib/ai/service";

/** Déclinaison IA d'une variante sur les autres plateformes. */
export async function POST(request: Request): Promise<Response> {
  const { status, body } = await runDecline(
    await readJsonBody(request),
    request.headers,
    request.signal,
  );
  return reply(body, status);
}
