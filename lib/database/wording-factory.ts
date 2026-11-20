import { extractEmojis, extractHashtags, normalizeText } from "@/lib/editorial/text-utils";
import { WordingSchema, type Mode, type Platform, type Source, type Wording } from "@/types/domain";
import { newId, sha256Hex } from "./hash";

export interface WordingInput {
  id?: string;
  text: string;
  mode: Mode;
  categoryId: string;
  platform: Platform;
  source: Source;
  status?: Wording["status"];
  isDemo?: boolean;
  /** Par défaut : vrai, sauf pour un exemple de démonstration. */
  isReference?: boolean;
  fighterIds?: string[];
  eventId?: string;
  date?: string;
  instagramUrl?: string;
  /** Par défaut : extraits du texte. */
  hashtags?: string[];
  cta?: string;
  tags?: string[];
  internalNotes?: string;
}

/**
 * Construit un wording complet et validé : champs dérivés (texte normalisé, hash,
 * emojis, hashtags) calculés à partir du texte, horodatage, identifiant.
 */
export async function createWording(input: WordingInput, now: Date = new Date()): Promise<Wording> {
  const text = input.text.replace(/\s+$/u, "").replace(/^\s*\n/u, "");
  const textNormalized = normalizeText(text);
  const isDemo = input.isDemo ?? false;
  const timestamp = now.toISOString();

  return WordingSchema.parse({
    id: input.id ?? newId(),
    text,
    textNormalized,
    contentHash: await sha256Hex(textNormalized),
    mode: input.mode,
    categoryId: input.categoryId,
    platform: input.platform,
    fighterIds: input.fighterIds ?? [],
    eventId: input.eventId,
    date: input.date,
    instagramUrl: input.instagramUrl,
    hashtags: input.hashtags ?? extractHashtags(text),
    emojis: extractEmojis(text),
    cta: input.cta,
    tags: input.tags ?? [],
    internalNotes: input.internalNotes,
    status: input.status ?? "validated",
    source: input.source,
    isDemo,
    isReference: input.isReference ?? !isDemo,
    createdAt: timestamp,
    updatedAt: timestamp,
  });
}
