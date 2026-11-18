// The channel's store (state-store.ts) on SQLite, through Node's built-in
// node:sqlite (DEC-2463). By the owner's rule for SQLite: STRICT tables,
// bound parameters only, and the schema made by numbered migrations, each
// applied once, in order, and recorded in the database. Every
// read-modify-write is one transaction begun with BEGIN IMMEDIATE
// (viewer-state.md VS-406).

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

import {
  checkHandle,
  checkName,
  checkVersion,
  idleOf,
  integerOf,
  jsonOf,
  type KeptViewer,
  MOST_SHARED_VALUE_LENGTH,
  MOST_VIEWER_VALUE_LENGTH,
  MOST_VIEWER_VALUES,
  parsed,
  REMEMBERED_VALUE_IDLE_MS,
  type StateStore,
  type StateStoreOptions,
  VISIT_VALUE_IDLE_MS,
} from "./state-store.ts";

/** A database held in memory, which lasts only as long as the program: for tests. */
export const IN_MEMORY = ":memory:";

/** How often, at most, the values past their idle limit are deleted, besides at open: an hour. */
const PRUNE_EVERY_MS = 60 * 60 * 1000;

/**
 * The schema, one migration a step, never edited once released: a change
 * is a new step at the end. The step's number is its place, from 1.
 */
const MIGRATIONS: readonly string[] = [
  `CREATE TABLE shared_value (
     name TEXT PRIMARY KEY NOT NULL,
     version INTEGER NOT NULL,
     value TEXT NOT NULL
   ) STRICT;
   CREATE TABLE session_value (
     session INTEGER NOT NULL,
     name TEXT NOT NULL,
     version INTEGER NOT NULL,
     value TEXT NOT NULL,
     touched_ms INTEGER NOT NULL,
     PRIMARY KEY (session, name)
   ) STRICT;
   CREATE INDEX session_value_touched ON session_value (touched_ms);`,
  // VS-405 and VS-603's migration: values by a connection's number cannot be given to their viewer, and could be anyone's, so they go, once.
  `DROP TABLE session_value;
   CREATE TABLE viewer_value (
     viewer TEXT NOT NULL CHECK (length(viewer) = 32),
     name TEXT NOT NULL,
     version INTEGER NOT NULL,
     value TEXT NOT NULL,
     touched_ms INTEGER NOT NULL,
     remembered INTEGER NOT NULL CHECK (remembered IN (0, 1)),
     PRIMARY KEY (viewer, name)
   ) STRICT;
   CREATE INDEX viewer_value_touched ON viewer_value (touched_ms);`,
];

/** A store in a SQLite database at `path`, made with its schema if it is new; IN_MEMORY for one that lasts only as long as the program. */
export class SqliteStateStore implements StateStore {
  readonly #db: DatabaseSync;
  readonly #now: () => number;
  /** How many viewers' values are kept, counted at open and as each is added or deleted. */
  #viewerValues = 0;
  #prunedAt = 0;
  /** Whether a transaction is open: work inside one joins it rather than beginning another. */
  #inTransaction = false;

  constructor(path: string, options: StateStoreOptions = {}) {
    this.#now = options.now ?? Date.now;
    if (path !== IN_MEMORY) {
      mkdirSync(dirname(path), { recursive: true });
    }
    this.#db = new DatabaseSync(path);
    // The write-ahead log lets a write go without rewriting the file, and NORMAL syncs at each checkpoint: a crash keeps every value written before the last one.
    this.#db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 1000;");
    this.#migrate();
    this.#countViewerValues();
    this.atomically(() => {
      this.#prune();
    });
  }

  #countViewerValues(): void {
    this.#viewerValues = integerOf(this.#db.prepare("SELECT count(*) AS n FROM viewer_value").get(), "n") ?? 0;
  }

  /** The numbered migrations not yet applied, each in its own transaction with its record. */
  #migrate(): void {
    this.#db.exec("CREATE TABLE IF NOT EXISTS schema_migration (number INTEGER PRIMARY KEY NOT NULL, applied_ms INTEGER NOT NULL) STRICT");
    const applied = integerOf(this.#db.prepare("SELECT max(number) AS n FROM schema_migration").get(), "n") ?? 0;
    if (applied > MIGRATIONS.length) {
      throw new Error(`the database is at migration ${applied}, made by a newer program than this one, which knows ${MIGRATIONS.length}`);
    }
    const record = this.#db.prepare("INSERT INTO schema_migration (number, applied_ms) VALUES (?, ?)");
    for (const [index, migration] of MIGRATIONS.entries()) {
      const number = index + 1;
      if (number <= applied) {
        continue;
      }
      this.atomically(() => {
        this.#db.exec(migration);
        record.run(number, this.#now());
      });
    }
  }

  atomically<Result>(work: () => Result): Result {
    if (this.#inTransaction) {
      return work();
    }
    // IMMEDIATE takes the write lock at once (VS-406), so another program on the file cannot write between this one's read and its write.
    this.#db.exec("BEGIN IMMEDIATE");
    this.#inTransaction = true;
    try {
      const result = work();
      this.#db.exec("COMMIT");
      return result;
    } catch (error) {
      this.#db.exec("ROLLBACK");
      // What was counted inside is undone with it.
      this.#countViewerValues();
      throw error;
    } finally {
      this.#inTransaction = false;
    }
  }

  shared(name: string, version: number): unknown {
    checkName(name);
    checkVersion(version);
    return this.atomically(() => {
      const row = this.#db.prepare("SELECT version, value FROM shared_value WHERE name = ?").get(name);
      const value = row !== undefined && integerOf(row, "version") === version ? parsed(row["value"]) : undefined;
      if (row !== undefined && value === undefined) {
        this.#db.prepare("DELETE FROM shared_value WHERE name = ?").run(name);
      }
      return value;
    });
  }

  keepShared(name: string, version: number, value: unknown): void {
    checkName(name);
    checkVersion(version);
    const text = jsonOf(value, MOST_SHARED_VALUE_LENGTH);
    this.#db
      .prepare(
        "INSERT INTO shared_value (name, version, value) VALUES (?, ?, ?) ON CONFLICT (name) DO UPDATE SET version = excluded.version, value = excluded.value",
      )
      .run(name, version, text);
  }

  ofViewer(viewer: KeptViewer, name: string, version: number): unknown {
    checkHandle(viewer.handle);
    checkName(name);
    checkVersion(version);
    return this.atomically(() => this.#read(viewer, name, version));
  }

  /** The value as ofViewer reads it, inside a transaction. */
  #read(viewer: KeptViewer, name: string, version: number): unknown {
    const row = this.#db.prepare("SELECT version, value, touched_ms, remembered FROM viewer_value WHERE viewer = ? AND name = ?").get(viewer.handle, name);
    if (row === undefined) {
      return undefined;
    }
    const now = this.#now();
    const live = (integerOf(row, "touched_ms") ?? 0) >= now - idleOf(integerOf(row, "remembered") === 1);
    const value = live && integerOf(row, "version") === version ? parsed(row["value"]) : undefined;
    if (value === undefined) {
      this.#viewerValues -= Number(this.#db.prepare("DELETE FROM viewer_value WHERE viewer = ? AND name = ?").run(viewer.handle, name).changes);
      return undefined;
    }
    // Read is used: the viewer is here, so their value lasts another idle limit from now, by what they chose now.
    this.#db
      .prepare("UPDATE viewer_value SET touched_ms = ?, remembered = ? WHERE viewer = ? AND name = ?")
      .run(now, viewer.remembered ? 1 : 0, viewer.handle, name);
    return value;
  }

  keepForViewer(viewer: KeptViewer, name: string, version: number, value: unknown): void {
    checkHandle(viewer.handle);
    checkName(name);
    checkVersion(version);
    const text = jsonOf(value, MOST_VIEWER_VALUE_LENGTH);
    this.atomically(() => {
      this.#write(viewer, name, version, text);
    });
  }

  /** Writes a value already checked, inside a transaction, and prunes when it is time. */
  #write(viewer: KeptViewer, name: string, version: number, text: string): void {
    const now = this.#now();
    const remembered = viewer.remembered ? 1 : 0;
    const updated = this.#db
      .prepare("UPDATE viewer_value SET version = ?, value = ?, touched_ms = ?, remembered = ? WHERE viewer = ? AND name = ?")
      .run(version, text, now, remembered, viewer.handle, name);
    if (updated.changes === 0) {
      this.#db
        .prepare("INSERT INTO viewer_value (viewer, name, version, value, touched_ms, remembered) VALUES (?, ?, ?, ?, ?, ?)")
        .run(viewer.handle, name, version, text, now, remembered);
      this.#viewerValues += 1;
    }
    if (now - this.#prunedAt >= PRUNE_EVERY_MS || this.#viewerValues > MOST_VIEWER_VALUES) {
      this.#prune();
    }
  }

  update(viewer: KeptViewer, name: string, version: number, change: (kept: unknown) => unknown): unknown {
    checkHandle(viewer.handle);
    checkName(name);
    checkVersion(version);
    return this.atomically(() => {
      const changed = change(this.#read(viewer, name, version));
      this.#write(viewer, name, version, jsonOf(changed, MOST_VIEWER_VALUE_LENGTH));
      return changed;
    });
  }

  forgetViewer(handle: string): void {
    checkHandle(handle);
    this.atomically(() => {
      this.#viewerValues -= Number(this.#db.prepare("DELETE FROM viewer_value WHERE viewer = ?").run(handle).changes);
    });
  }

  forgetViewers(): void {
    this.atomically(() => {
      this.#db.prepare("DELETE FROM viewer_value").run();
      this.#viewerValues = 0;
    });
  }

  /** Deletes the values past their idle limit, then the oldest past MOST_VIEWER_VALUES; inside a transaction. */
  #prune(): void {
    const now = this.#now();
    this.#prunedAt = now;
    this.#viewerValues -= Number(
      this.#db
        .prepare("DELETE FROM viewer_value WHERE (remembered = 0 AND touched_ms < ?) OR (remembered = 1 AND touched_ms < ?)")
        .run(now - VISIT_VALUE_IDLE_MS, now - REMEMBERED_VALUE_IDLE_MS).changes,
    );
    const over = this.#viewerValues - MOST_VIEWER_VALUES;
    if (over > 0) {
      this.#viewerValues -= Number(
        this.#db.prepare("DELETE FROM viewer_value WHERE rowid IN (SELECT rowid FROM viewer_value ORDER BY touched_ms LIMIT ?)").run(over).changes,
      );
    }
  }

  /** How many viewers' values are kept: for tests. */
  get viewerValues(): number {
    return this.#viewerValues;
  }

  /** Closes the database; the store is not used after. */
  close(): void {
    this.#db.close();
  }
}
