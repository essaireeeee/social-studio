/**
 * Lecture et réponse HTTP communes aux routes IA. Le corps n'est jamais journalisé.
 */
const MAX_BODY_BYTES = 512 * 1024;

/** Corps JSON de la requête, ou `undefined` s'il est absent, trop gros ou illisible. */
export async function readJsonBody(request: Request): Promise<unknown> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return undefined;
  const text = await request.text().catch(() => "");
  if (!text || text.length > MAX_BODY_BYTES) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

export function reply(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
