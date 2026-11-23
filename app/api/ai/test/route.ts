import { readJsonBody, reply } from "@/lib/ai/http";
import { runTest } from "@/lib/ai/service";

/** Test de connexion : vrai appel minimal au fournisseur, latence et modèle, ou l'erreur exacte. */
export async function POST(request: Request): Promise<Response> {
  const { status, body } = await runTest(await readJsonBody(request), request.headers);
  return reply(body, status);
}
