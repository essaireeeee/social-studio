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
import type {
  CalendarItem,
  Campaign,
  Engagement,
  FrenchDictionaryEntry,
  FrenchIssueRecord,
  FrenchRuleState,
  NewsItem,
  NewsSource,
  Reminder,
  Suggestion,
} from "@/types/v2";

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

/**
 * Tables ajoutées en v2 (section 3.2 de PROMPT_V2.md), avec trois écarts :
 * - `calendarItems` : index multi-valeurs `*platforms` (le champ est une liste) au lieu de `platform` ;
 * - `frenchRules` et `newsSources` : pas d'index sur `enabled` (booléen, voir plus haut) ;
 * - `frenchIssues` et `newsItems` : index utiles aux statistiques et à la déduplication.
 * Les tables V1 sont reprises telles quelles.
 */
export const DEXIE_SCHEMA_V2 = {
  ...DEXIE_SCHEMA_V1,
  calendarItems:
    "id, type, status, scheduledAt, campaignId, generationId, eventId, *platforms, [status+scheduledAt]",
  reminders: "id, calendarItemId, fireAt, firedAt, dismissedAt",
  campaigns: "id, eventId, status, createdAt, *fighterIds",
  suggestions: "id, kind, status, score, createdAt, expiresAt, dedupeKey",
  frenchRules: "id, family, level",
  frenchDictionary: "id, word, kind",
  frenchIssues: "id, ruleId, createdAt, resolution",
  newsSources: "id",
  newsItems: "id, sourceId, publishedAt, url, *matchedFighterIds",
  engagement: "id, wordingId, recordedAt",
} as const;

export const DEXIE_VERSION = 2;

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
  calendarItems: Table<CalendarItem, string>;
  reminders: Table<Reminder, string>;
  campaigns: Table<Campaign, string>;
  suggestions: Table<Suggestion, string>;
  frenchRules: Table<FrenchRuleState, string>;
  frenchDictionary: Table<FrenchDictionaryEntry, string>;
  frenchIssues: Table<FrenchIssueRecord, string>;
  newsSources: Table<NewsSource, string>;
  newsItems: Table<NewsItem, string>;
  engagement: Table<Engagement, string>;
  meta: Table<MetaRecord, string>;
};

export function createDatabase(name: string = DB_NAME): HexagoneDB {
  const db = new Dexie(name) as HexagoneDB;
  db.version(1).stores(DEXIE_SCHEMA_V1);
  db.version(2)
    .stores(DEXIE_SCHEMA_V2)
    .upgrade(async (tx) => {
      // Migration douce : les fiches V1 reçoivent une liste de jalons vide.
      // Aucune autre donnée V1 n'est modifiée ; les nouvelles tables naissent vides.
      await tx
        .table("events")
        .toCollection()
        .modify((event: Record<string, unknown>) => {
          if (!Array.isArray(event.milestones)) event.milestones = [];
        });
      if ((await tx.table("meta").get("schemaVersion")) !== undefined) {
        await tx.table("meta").put({ key: "schemaVersion", value: 2 });
      }
    });
  return db;
}
