/**
 * Contrat d'accès aux données. Toutes les écritures de l'application passent par lui.
 * `DexieRepository` (IndexedDB), schéma 2. Plus tard : `SupabaseRepository` (voir supabase.README.md).
 */
import type {
  BlobRecord,
  EditorialRule,
  Fighter,
  Generation,
  HashtagGroup,
  HexEvent,
  LiveSession,
  SavedHook,
  Settings,
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
import type { Snapshot, TableName } from "./snapshot";

export interface EntityMap {
  wordings: Wording;
  fighters: Fighter;
  events: HexEvent;
  liveSessions: LiveSession;
  generations: Generation;
  hashtagGroups: HashtagGroup;
  signatures: Signature;
  rules: EditorialRule;
  styleProfiles: StyleProfile;
  users: UserProfile;
  blobs: BlobRecord;
  calendarItems: CalendarItem;
  reminders: Reminder;
  campaigns: Campaign;
  suggestions: Suggestion;
  frenchRules: FrenchRuleState;
  frenchDictionary: FrenchDictionaryEntry;
  frenchIssues: FrenchIssueRecord;
  newsSources: NewsSource;
  newsItems: NewsItem;
  engagement: Engagement;
}

export type IndexableValue = string | number;

export interface ListQuery<T> {
  /** Égalité sur un index déclaré (ex. `{ index: "mode", equals: "live" }`). */
  where?: { index: string; equals: IndexableValue };
  /** Tri sur un index déclaré. */
  orderBy?: string;
  reverse?: boolean;
  offset?: number;
  limit?: number;
  /** Filtre en mémoire, pour les champs non indexés (booléens notamment). */
  filter?: (item: T) => boolean;
}

export interface EntityStore<T extends { id: string }> {
  list(query?: ListQuery<T>): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  /** Valide (Zod) puis enregistre. Renvoie l'objet tel que stocké. */
  put(item: T): Promise<T>;
  bulkPut(items: T[]): Promise<void>;
  /** La confirmation de suppression est à la charge de l'interface. */
  delete(id: string): Promise<void>;
  /** Recherche simple : chaque mot (normalisé) doit être présent. Le classement BM25 arrive en Phase 4. */
  search(term: string, limit?: number): Promise<T[]>;
  count(): Promise<number>;
}

export interface MetaValues {
  schemaVersion: number;
  seedVersion: number;
  lastBackupAt: string;
  settings: Settings;
  hookBank: SavedHook[];
  /** V2 : progression de l'entraînement de l'Atelier Français, par famille de règles. */
  frenchProgress: Partial<Record<string, { answered: number; correct: number }>>;
}
export type MetaKey = keyof MetaValues;

export type ImportStrategy = "merge" | "replace";

/** Reçoit l'état courant avant un remplacement et doit le mettre en lieu sûr, ou lever une erreur. */
export type BackupHandler = (current: Snapshot) => Promise<void>;

export interface ImportOptions {
  backup?: BackupHandler;
}

export interface ImportReport {
  strategy: ImportStrategy;
  added: Record<TableName, number>;
  skipped: Record<TableName, number>;
  backupCreated: boolean;
}

export interface ChangeEvent {
  table: TableName | "meta" | "*";
  type: "put" | "delete" | "import";
  ids?: string[];
}

export interface DataRepository {
  readonly wordings: EntityStore<Wording>;
  readonly fighters: EntityStore<Fighter>;
  readonly events: EntityStore<HexEvent>;
  readonly liveSessions: EntityStore<LiveSession>;
  readonly generations: EntityStore<Generation>;
  readonly hashtagGroups: EntityStore<HashtagGroup>;
  readonly signatures: EntityStore<Signature>;
  readonly rules: EntityStore<EditorialRule>;
  readonly styleProfiles: EntityStore<StyleProfile>;
  readonly users: EntityStore<UserProfile>;
  readonly blobs: EntityStore<BlobRecord>;
  readonly calendarItems: EntityStore<CalendarItem>;
  readonly reminders: EntityStore<Reminder>;
  readonly campaigns: EntityStore<Campaign>;
  readonly suggestions: EntityStore<Suggestion>;
  readonly frenchRules: EntityStore<FrenchRuleState>;
  readonly frenchDictionary: EntityStore<FrenchDictionaryEntry>;
  readonly frenchIssues: EntityStore<FrenchIssueRecord>;
  readonly newsSources: EntityStore<NewsSource>;
  readonly newsItems: EntityStore<NewsItem>;
  readonly engagement: EntityStore<Engagement>;

  getMeta<K extends MetaKey>(key: K): Promise<MetaValues[K] | undefined>;
  setMeta<K extends MetaKey>(key: K, value: MetaValues[K]): Promise<void>;
  /** Réglages enregistrés, complétés par les valeurs par défaut. */
  getSettings(): Promise<Settings>;
  saveSettings(settings: Settings): Promise<Settings>;

  /** Vrai si aucune table ne contient de donnée et qu'aucun seed n'a tourné. */
  isEmpty(): Promise<boolean>;
  /** Exécute `fn` dans une transaction couvrant toutes les tables (pas d'attente externe dedans). */
  transaction<R>(fn: () => Promise<R>): Promise<R>;

  exportAll(): Promise<Snapshot>;
  /**
   * `merge` : ajoute ce qui manque, ignore les doublons (même id, ou même contenu pour les wordings).
   * `replace` : remplace tout. Si la base n'est pas vide, `options.backup` est obligatoire et appelé avant.
   */
  importAll(
    snapshot: unknown,
    strategy: ImportStrategy,
    options?: ImportOptions,
  ): Promise<ImportReport>;

  onChange(listener: (event: ChangeEvent) => void): () => void;
  close(): void;
}

export class BackupRequiredError extends Error {
  override name = "BackupRequiredError";
  constructor() {
    super("Une sauvegarde de l'état actuel est obligatoire avant de remplacer les données.");
  }
}
