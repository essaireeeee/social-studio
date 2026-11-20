/**
 * Base IndexedDB (Dexie). Source de vérité côté navigateur.
 * N'importer que depuis du code client ou des tests (fake-indexeddb).
 */
import Dexie, { type Table } from "dexie";
import type {
  BlobRecord,
  EditorialRule,
  Fighter,
  Generation,
  HashtagGroup,
  HexEvent,
  LiveSession,
  Signature,
  StyleProfile,
  UserProfile,
  Wording,
} from "@/types/domain";

export const DB_NAME = "hexagone-social-studio";

export interface MetaRecord {
  key: string;
  value: unknown;
}

/**
 * Schéma v1 (section 6.2 de PROMPT.md), sans les index sur des booléens :
 * IndexedDB n'accepte pas `true`/`false` comme clé d'index. Un index sur `isDemo`,
 * `isReference` ou `active` resterait vide et `where('isDemo')` ne renverrait rien.
 * Ces champs sont filtrés en mémoire (voir PROGRESS.md, Phase 1).
 */
export const DEXIE_SCHEMA_V1 = {
  wordings:
    "id, mode, categoryId, platform, eventId, date, contentHash, status, *fighterIds, *tags, *hashtags, updatedAt",
  fighters: "id, lastName, nickname, weightClass, updatedAt",
  events: "id, date, name, updatedAt",
  liveSessions: "id, startedAt",
  generations: "id, createdAt, status, [brief.mode+createdAt]",
  hashtagGroups: "id, kind",
  signatures: "id",
  rules: "id",
  styleProfiles: "id, mode, createdAt, status",
  users: "id",
  blobs: "id",
  meta: "key",
} as const;

export type HexagoneDB = Dexie & {
  wordings: Table<Wording, string>;
  fighters: Table<Fighter, string>;
  events: Table<HexEvent, string>;
  liveSessions: Table<LiveSession, string>;
  generations: Table<Generation, string>;
  hashtagGroups: Table<HashtagGroup, string>;
  signatures: Table<Signature, string>;
  rules: Table<EditorialRule, string>;
  styleProfiles: Table<StyleProfile, string>;
  users: Table<UserProfile, string>;
  blobs: Table<BlobRecord, string>;
  meta: Table<MetaRecord, string>;
};

export function createDatabase(name: string = DB_NAME): HexagoneDB {
  const db = new Dexie(name) as HexagoneDB;
  db.version(1).stores(DEXIE_SCHEMA_V1);
  return db;
}
