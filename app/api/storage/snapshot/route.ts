import path from "node:path";
import { z } from "zod";
import {
  getStorageConfig,
  isReadOnlyError,
  writeSnapshot,
  type FileSummary,
} from "@/lib/database/file-store.server";
import { CURRENT_SCHEMA_VERSION } from "@/lib/database/migrations";
import { SnapshotSchema, countSnapshot, findForbiddenFields } from "@/lib/database/snapshot";

const BodySchema = z.object({
  reason: z.enum(["auto", "manual", "pre-replace"]).default("auto"),
  snapshot: SnapshotSchema,
});

function reply(body: Record<string, unknown>, status = 200): Response {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/**
 * Reçoit un instantané complet et l'écrit dans `data/hexagone-studio.json`.
 * Le corps n'est jamais journalisé.
 */
export async function POST(request: Request): Promise<Response> {
  const config = getStorageConfig();
  if (!config.enabled) {
    return reply(
      { error: "disabled", message: "Sauvegarde fichier désactivée (FILE_SYNC_ENABLED=false)." },
      403,
    );
  }

  const maxMb = Math.round(config.maxBytes / (1024 * 1024));
  const tooLarge = () =>
    reply(
      { error: "too_large", message: `Instantané trop volumineux (limite : ${maxMb} Mo).` },
      413,
    );

  if (Number(request.headers.get("content-length") ?? 0) > config.maxBytes) return tooLarge();
  const text = await request.text();
  if (Buffer.byteLength(text, "utf8") > config.maxBytes) return tooLarge();

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return reply({ error: "invalid_json", message: "Corps JSON illisible." }, 400);
  }

  // Défense en profondeur (règle 1.5) : un champ de type clé ou jeton est refusé, pas filtré en silence.
  const forbidden = findForbiddenFields(raw);
  if (forbidden.length > 0) {
    return reply(
      {
        error: "forbidden_fields",
        message: "L'instantané contient des champs interdits (clé, jeton, secret).",
        paths: forbidden.slice(0, 10),
      },
      422,
    );
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return reply(
      {
        error: "invalid_snapshot",
        message: `Instantané invalide (${issue?.path.join(".") || "racine"} : ${issue?.message ?? "inconnu"}).`,
      },
      400,
    );
  }

  const { snapshot, reason } = parsed.data;
  if (snapshot.schemaVersion !== CURRENT_SCHEMA_VERSION) {
    return reply(
      {
        error: "schema_mismatch",
        message: "La page utilise une autre version du schéma de données. Rechargez-la.",
      },
      409,
    );
  }

  const now = new Date();
  const summary: FileSummary = {
    savedAt: now.toISOString(),
    schemaVersion: snapshot.schemaVersion,
    counts: countSnapshot(snapshot),
  };

  try {
    const result = await writeSnapshot(
      config,
      JSON.stringify(snapshot, null, 2),
      summary,
      reason,
      now,
    );
    return reply({
      ok: true,
      savedAt: summary.savedAt,
      counts: summary.counts,
      backups: result.backups.map((file) => path.basename(file)),
    });
  } catch (error) {
    if (isReadOnlyError(error)) {
      return reply(
        {
          error: "read_only",
          message: "Environnement en lecture seule : la sauvegarde fichier est désactivée.",
        },
        503,
      );
    }
    console.error("Écriture de la sauvegarde locale impossible :", (error as Error).message);
    return reply(
      { error: "write_failed", message: "Écriture du fichier de sauvegarde impossible." },
      500,
    );
  }
}
