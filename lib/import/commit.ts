/**
 * Enregistrement d'un import (étape « Confirmer », section 14.3). Les lignes cochées et
 * catégorisées deviennent des wordings ; un doublon exact de la bibliothèque n'est
 * remplacé que si « Remplacer » a été confirmé. Au-delà de 10 publications importées,
 * le profil de style du mode est recalculé (proposé, à valider par un administrateur).
 */
import type { DataRepository } from "@/lib/database/repository";
import { createWording } from "@/lib/database/wording-factory";
import { detectCta } from "@/lib/editorial/cta";
import { recomputeAfterImport } from "@/lib/editorial/profile-service";
import { findEvent, findFighter } from "@/lib/generation/native/context";
import type { Source, Wording } from "@/types/domain";
import type { ImportRow } from "./rows";

export interface CommitResult {
  created: number;
  replaced: number;
  skipped: number;
  /** Profils recalculés (proposés) après l'import. */
  profilesRecomputed: number;
}

export async function commitImport(
  repository: DataRepository,
  rows: readonly ImportRow[],
  options: { source: Source; replace?: boolean; now?: Date },
): Promise<CommitResult> {
  const [fighters, events] = await Promise.all([
    repository.fighters.list(),
    repository.events.list(),
  ]);
  const wordings: Wording[] = [];
  let replaced = 0;
  let skipped = 0;
  for (const row of rows) {
    if (!row.selected || !row.categoryId) {
      skipped += 1;
      continue;
    }
    const duplicate = row.duplicate;
    const exactInLibrary = duplicate.kind === "exact" && !duplicate.inBatch;
    if (duplicate.kind === "exact" && !(exactInLibrary && options.replace)) {
      skipped += 1;
      continue;
    }
    const replacing =
      duplicate.kind === "exact" && exactInLibrary && options.replace ? duplicate.of : undefined;
    if (replacing) replaced += 1;
    wordings.push(
      await createWording(
        {
          id: replacing,
          text: row.text,
          mode: row.mode,
          categoryId: row.categoryId,
          platform: row.platform,
          source: options.source,
          status: "published",
          fighterIds: (row.fighters ?? [])
            .map((name) => findFighter(name, fighters)?.id)
            .filter((id): id is string => Boolean(id)),
          eventId: row.event ? findEvent(row.event, events)?.id : undefined,
          date: row.date,
          instagramUrl: row.url && /^https?:\/\//.test(row.url) ? row.url : undefined,
          hashtags: row.hashtags,
          cta: row.cta ?? detectCta(row.text) ?? undefined,
          tags: row.tags,
          internalNotes: row.notes,
        },
        options.now,
      ),
    );
  }
  await repository.wordings.bulkPut(wordings);
  const profiles = await recomputeAfterImport(repository, wordings, options.now);
  return {
    created: wordings.length - replaced,
    replaced,
    skipped,
    profilesRecomputed: profiles.length,
  };
}
