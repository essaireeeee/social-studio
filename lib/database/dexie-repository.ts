import type { Collection, Table } from "dexie";
import type { z } from "zod";
import { normalizeText } from "@/lib/editorial/text-utils";
import {
  BlobRecordSchema,
  EditorialRuleSchema,
  FighterSchema,
  GenerationSchema,
  HashtagGroupSchema,
  HexEventSchema,
  LiveSessionSchema,
  SettingsSchema,
  SignatureSchema,
  StyleProfileSchema,
  UserProfileSchema,
  WordingSchema,
  APP_ID,
  type Settings,
} from "@/types/domain";
import { createDatabase, type HexagoneDB } from "./db";
import { CURRENT_SCHEMA_VERSION, migrateSnapshot } from "./migrations";
import {
  BackupRequiredError,
  type ChangeEvent,
  type DataRepository,
  type EntityMap,
  type EntityStore,
  type ImportOptions,
  type ImportReport,
  type ImportStrategy,
  type ListQuery,
  type MetaKey,
  type MetaValues,
} from "./repository";
import {
  SnapshotSchema,
  TABLE_NAMES,
  type Snapshot,
  type SnapshotMeta,
  type TableName,
} from "./snapshot";

type Emit = (event: ChangeEvent) => void;

class DexieEntityStore<T extends { id: string }> implements EntityStore<T> {
  constructor(
    private readonly name: TableName,
    private readonly table: Table<T, string>,
    private readonly schema: z.ZodType<T>,
    private readonly searchText: (item: T) => string,
    private readonly emit: Emit,
  ) {}

  async list(query: ListQuery<T> = {}): Promise<T[]> {
    let collection: Collection<T, string>;
    if (query.where) {
      collection = this.table.where(query.where.index).equals(query.where.equals);
    } else if (query.orderBy) {
      collection = this.table.orderBy(query.orderBy);
    } else {
      collection = this.table.toCollection();
    }
    if (query.filter) {
      collection = collection.filter(query.filter);
    }

    // where + orderBy ne se combinent pas nativement : tri en mémoire.
    if (query.where && query.orderBy) {
      const sorted = await collection.sortBy(query.orderBy);
      if (query.reverse) sorted.reverse();
      const start = query.offset ?? 0;
      return sorted.slice(start, query.limit === undefined ? undefined : start + query.limit);
    }

    if (query.reverse) collection = collection.reverse();
    if (query.offset) collection = collection.offset(query.offset);
    if (query.limit !== undefined) collection = collection.limit(query.limit);
    return collection.toArray();
  }

  get(id: string): Promise<T | undefined> {
    return this.table.get(id);
  }

  async put(item: T): Promise<T> {
    const parsed = this.schema.parse(item);
    await this.table.put(parsed);
    this.emit({ table: this.name, type: "put", ids: [parsed.id] });
    return parsed;
  }

  async bulkPut(items: T[]): Promise<void> {
    if (items.length === 0) return;
    const parsed = items.map((item) => this.schema.parse(item));
    await this.table.bulkPut(parsed);
    this.emit({ table: this.name, type: "put", ids: parsed.map((item) => item.id) });
  }

  async delete(id: string): Promise<void> {
    await this.table.delete(id);
    this.emit({ table: this.name, type: "delete", ids: [id] });
  }

  /** Chaque mot recherché doit apparaître (dans n'importe quel ordre). */
  async search(term: string, limit = 50): Promise<T[]> {
    const words = normalizeText(term).split(" ").filter(Boolean);
    if (words.length === 0) return [];
    return this.table
      .filter((item) => {
        const haystack = this.searchText(item);
        return words.every((word) => haystack.includes(word));
      })
      .limit(limit)
      .toArray();
  }

  count(): Promise<number> {
    return this.table.count();
  }
}

const joinNormalized = (...parts: Array<string | undefined>) =>
  normalizeText(parts.filter(Boolean).join(" "));

function emptyCounts(): Record<TableName, number> {
  return Object.fromEntries(TABLE_NAMES.map((name) => [name, 0])) as Record<TableName, number>;
}

export class DexieRepository implements DataRepository {
  readonly wordings: EntityStore<EntityMap["wordings"]>;
  readonly fighters: EntityStore<EntityMap["fighters"]>;
  readonly events: EntityStore<EntityMap["events"]>;
  readonly liveSessions: EntityStore<EntityMap["liveSessions"]>;
  readonly generations: EntityStore<EntityMap["generations"]>;
  readonly hashtagGroups: EntityStore<EntityMap["hashtagGroups"]>;
  readonly signatures: EntityStore<EntityMap["signatures"]>;
  readonly rules: EntityStore<EntityMap["rules"]>;
  readonly styleProfiles: EntityStore<EntityMap["styleProfiles"]>;
  readonly users: EntityStore<EntityMap["users"]>;
  readonly blobs: EntityStore<EntityMap["blobs"]>;

  private readonly listeners = new Set<(event: ChangeEvent) => void>();

  constructor(
    readonly db: HexagoneDB = createDatabase(),
    private readonly now: () => Date = () => new Date(),
  ) {
    const emit: Emit = (event) => this.emit(event);
    this.wordings = new DexieEntityStore(
      "wordings",
      db.wordings,
      WordingSchema,
      (w) => `${w.textNormalized} ${normalizeText(w.tags.join(" "))}`,
      emit,
    );
    this.fighters = new DexieEntityStore(
      "fighters",
      db.fighters,
      FighterSchema,
      (f) => joinNormalized(f.firstName, f.lastName, f.nickname, f.club, f.weightClass),
      emit,
    );
    this.events = new DexieEntityStore(
      "events",
      db.events,
      HexEventSchema,
      (e) => joinNormalized(e.name, e.number?.toString(), e.city, e.venue),
      emit,
    );
    this.liveSessions = new DexieEntityStore(
      "liveSessions",
      db.liveSessions,
      LiveSessionSchema,
      (s) => joinNormalized(s.eventName, s.city, s.venue),
      emit,
    );
    this.generations = new DexieEntityStore(
      "generations",
      db.generations,
      GenerationSchema,
      (g) => joinNormalized(g.finalText, ...g.variants.map((v) => v.revisions.at(-1)?.text)),
      emit,
    );
    this.hashtagGroups = new DexieEntityStore(
      "hashtagGroups",
      db.hashtagGroups,
      HashtagGroupSchema,
      (h) => joinNormalized(h.name, ...h.tags),
      emit,
    );
    this.signatures = new DexieEntityStore(
      "signatures",
      db.signatures,
      SignatureSchema,
      (s) => joinNormalized(s.name, s.template),
      emit,
    );
    this.rules = new DexieEntityStore(
      "rules",
      db.rules,
      EditorialRuleSchema,
      (r) => joinNormalized(r.label, r.description),
      emit,
    );
    this.styleProfiles = new DexieEntityStore(
      "styleProfiles",
      db.styleProfiles,
      StyleProfileSchema,
      (p) => joinNormalized(p.mode),
      emit,
    );
    this.users = new DexieEntityStore(
      "users",
      db.users,
      UserProfileSchema,
      (u) => joinNormalized(u.name),
      emit,
    );
    this.blobs = new DexieEntityStore(
      "blobs",
      db.blobs,
      BlobRecordSchema,
      (b) => joinNormalized(b.kind),
      emit,
    );
  }

  // --- Méta et réglages -----------------------------------------------------

  async getMeta<K extends MetaKey>(key: K): Promise<MetaValues[K] | undefined> {
    const record = await this.db.meta.get(key);
    return record?.value as MetaValues[K] | undefined;
  }

  async setMeta<K extends MetaKey>(key: K, value: MetaValues[K]): Promise<void> {
    await this.db.meta.put({ key, value });
    this.emit({ table: "meta", type: "put", ids: [key] });
  }

  async getSettings(): Promise<Settings> {
    const stored = await this.getMeta("settings");
    const parsed = SettingsSchema.safeParse(stored ?? {});
    return parsed.success ? parsed.data : SettingsSchema.parse({});
  }

  async saveSettings(settings: Settings): Promise<Settings> {
    const parsed = SettingsSchema.parse(settings);
    await this.setMeta("settings", parsed);
    return parsed;
  }

  // --- État global ----------------------------------------------------------

  async isEmpty(): Promise<boolean> {
    if ((await this.getMeta("seedVersion")) !== undefined) return false;
    const counts = await Promise.all(TABLE_NAMES.map((name) => this.db.table(name).count()));
    return counts.every((count) => count === 0);
  }

  transaction<R>(fn: () => Promise<R>): Promise<R> {
    return this.db.transaction("rw", this.db.tables, fn);
  }

  // --- Export / import ------------------------------------------------------

  async exportAll(): Promise<Snapshot> {
    return this.db.transaction("r", this.db.tables, async () => {
      const entries = await Promise.all(
        TABLE_NAMES.map(async (name) => [name, await this.db.table(name).toArray()] as const),
      );
      const meta: SnapshotMeta = {
        seedVersion: await this.getMeta("seedVersion"),
        lastBackupAt: await this.getMeta("lastBackupAt"),
        settings: await this.getMeta("settings"),
      };
      return SnapshotSchema.parse({
        app: APP_ID,
        schemaVersion: CURRENT_SCHEMA_VERSION,
        exportedAt: this.now().toISOString(),
        tables: Object.fromEntries(entries),
        meta,
      });
    });
  }

  async importAll(
    raw: unknown,
    strategy: ImportStrategy,
    options: ImportOptions = {},
  ): Promise<ImportReport> {
    const snapshot = migrateSnapshot(raw);
    const report: ImportReport = {
      strategy,
      added: emptyCounts(),
      skipped: emptyCounts(),
      backupCreated: false,
    };

    if (strategy === "replace") {
      if (!(await this.isEmpty())) {
        if (!options.backup) throw new BackupRequiredError();
        // La sauvegarde (souvent un appel réseau) se fait hors transaction IndexedDB.
        await options.backup(await this.exportAll());
        report.backupCreated = true;
      }
      await this.db.transaction("rw", this.db.tables, async () => {
        await Promise.all(this.db.tables.map((t) => t.clear()));
        for (const name of TABLE_NAMES) {
          const rows = snapshot.tables[name];
          await this.db.table(name).bulkPut(rows);
          report.added[name] = rows.length;
        }
        await this.writeMeta(snapshot.meta, { overwrite: true });
      });
    } else {
      await this.db.transaction("rw", this.db.tables, async () => {
        for (const name of TABLE_NAMES) {
          const t = this.db.table(name);
          const existingIds = new Set((await t.toCollection().primaryKeys()) as string[]);
          const seenHashes =
            name === "wordings"
              ? new Set((await this.db.wordings.orderBy("contentHash").uniqueKeys()) as string[])
              : null;

          const toAdd = snapshot.tables[name].filter((row) => {
            if (existingIds.has(row.id)) return false;
            if (seenHashes && "contentHash" in row) {
              if (seenHashes.has(row.contentHash)) return false;
              seenHashes.add(row.contentHash);
            }
            existingIds.add(row.id);
            return true;
          });
          await t.bulkPut(toAdd);
          report.added[name] = toAdd.length;
          report.skipped[name] = snapshot.tables[name].length - toAdd.length;
        }
        await this.writeMeta(snapshot.meta, { overwrite: false });
      });
    }

    this.emit({ table: "*", type: "import" });
    return report;
  }

  /** En fusion, les méta existantes (réglages, version de seed) sont conservées. */
  private async writeMeta(meta: SnapshotMeta, { overwrite }: { overwrite: boolean }) {
    await this.db.meta.put({ key: "schemaVersion", value: CURRENT_SCHEMA_VERSION });
    for (const key of ["seedVersion", "lastBackupAt", "settings"] as const) {
      const value = meta[key];
      if (value === undefined) continue;
      if (overwrite || (await this.db.meta.get(key)) === undefined) {
        await this.db.meta.put({ key, value });
      }
    }
  }

  // --- Notifications --------------------------------------------------------

  onChange(listener: (event: ChangeEvent) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private emit(event: ChangeEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error("Écouteur de changement en erreur", error);
      }
    }
  }

  close(): void {
    this.db.close();
  }
}
