/**
 * Format d'instantané : export JSON intégral, fichier `data/hexagone-studio.json`,
 * sauvegardes et import. Module isomorphe (client et serveur), sans Dexie.
 */
import { z } from "zod";
import {
  APP_ID,
  BlobRecordSchema,
  EditorialRuleSchema,
  FighterSchema,
  GenerationSchema,
  HashtagGroupSchema,
  HexEventSchema,
  IsoDateSchema,
  LiveSessionSchema,
  SavedHookSchema,
  SettingsSchema,
  SignatureSchema,
  StyleProfileSchema,
  UserProfileSchema,
  WordingSchema,
} from "@/types/domain";
import {
  CalendarItemSchema,
  CampaignSchema,
  EngagementSchema,
  FrenchDictionaryEntrySchema,
  FrenchIssueRecordSchema,
  FrenchRuleStateSchema,
  NewsItemSchema,
  NewsSourceSchema,
  ReminderSchema,
  SuggestionSchema,
} from "@/types/v2";

export const TABLE_NAMES = [
  "wordings",
  "fighters",
  "events",
  "liveSessions",
  "generations",
  "hashtagGroups",
  "signatures",
  "rules",
  "styleProfiles",
  "users",
  "blobs",
  // v2
  "calendarItems",
  "reminders",
  "campaigns",
  "suggestions",
  "frenchRules",
  "frenchDictionary",
  "frenchIssues",
  "newsSources",
  "newsItems",
  "engagement",
] as const;

/** Tables apparues en v2 : absentes des instantanés v1. */
export const V2_TABLE_NAMES = [
  "calendarItems",
  "reminders",
  "campaigns",
  "suggestions",
  "frenchRules",
  "frenchDictionary",
  "frenchIssues",
  "newsSources",
  "newsItems",
  "engagement",
] as const satisfies readonly TableName[];
export type TableName = (typeof TABLE_NAMES)[number];

const table = <T extends z.ZodType>(schema: T) => z.array(schema).default(() => []);

export const SnapshotTablesSchema = z.object({
  wordings: table(WordingSchema),
  fighters: table(FighterSchema),
  events: table(HexEventSchema),
  liveSessions: table(LiveSessionSchema),
  generations: table(GenerationSchema),
  hashtagGroups: table(HashtagGroupSchema),
  signatures: table(SignatureSchema),
  rules: table(EditorialRuleSchema),
  styleProfiles: table(StyleProfileSchema),
  users: table(UserProfileSchema),
  blobs: table(BlobRecordSchema),
  calendarItems: table(CalendarItemSchema),
  reminders: table(ReminderSchema),
  campaigns: table(CampaignSchema),
  suggestions: table(SuggestionSchema),
  frenchRules: table(FrenchRuleStateSchema),
  frenchDictionary: table(FrenchDictionaryEntrySchema),
  frenchIssues: table(FrenchIssueRecordSchema),
  newsSources: table(NewsSourceSchema),
  newsItems: table(NewsItemSchema),
  engagement: table(EngagementSchema),
});
export type SnapshotTables = z.infer<typeof SnapshotTablesSchema>;

/**
 * Métadonnées exportées. Elles forment un objet et non une liste d'enregistrements
 * `{ key, value }` : un instantané ne contient ainsi aucun champ nommé `key`.
 */
export const SnapshotMetaSchema = z.object({
  seedVersion: z.number().int().nonnegative().optional(),
  lastBackupAt: IsoDateSchema.optional(),
  settings: SettingsSchema.optional(),
  hookBank: z.array(SavedHookSchema).optional(),
});
export type SnapshotMeta = z.infer<typeof SnapshotMetaSchema>;

export const SnapshotSchema = z.object({
  app: z.literal(APP_ID),
  schemaVersion: z.number().int().positive(),
  exportedAt: IsoDateSchema,
  tables: SnapshotTablesSchema.prefault({}),
  meta: SnapshotMetaSchema.prefault({}),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;

export type SnapshotCounts = Record<TableName, number>;

export function countSnapshot(snapshot: Pick<Snapshot, "tables">): SnapshotCounts {
  const counts = {} as SnapshotCounts;
  for (const name of TABLE_NAMES) {
    counts[name] = snapshot.tables[name].length;
  }
  return counts;
}

/** Noms de champs qui ne doivent jamais apparaître dans une sauvegarde (règle 1.5). */
const FORBIDDEN_FIELD =
  /^(api[-_]?key|key|token|access[-_]?token|refresh[-_]?token|secret|password|authorization)$/i;

/** Chemins des champs interdits trouvés dans une valeur JSON (parcours profond). */
export function findForbiddenFields(value: unknown, path = "$"): string[] {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => findForbiddenFields(item, `${path}[${index}]`));
  }
  if (value !== null && typeof value === "object") {
    return Object.entries(value).flatMap(([field, child]) => {
      const childPath = `${path}.${field}`;
      const own = FORBIDDEN_FIELD.test(field) ? [childPath] : [];
      return [...own, ...findForbiddenFields(child, childPath)];
    });
  }
  return [];
}
