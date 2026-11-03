// What a channel keeps across a restart of its program (REQ-1057), in a
// SQLite database of its own through Node's built-in node:sqlite: what
// every viewer shares, by name, and what one viewer owns, by their
// session's number and a name. Each value is plain JSON with a schema
// version; a value of another version is dropped when it is read, so a
// program that changes a value's shape raises its version and starts it
// afresh. A component's kept state (REQ-1058) is one viewer's value.
//
// By the owner's rule for SQLite: STRICT tables, bound parameters only,
// and the schema made by numbered migrations, each applied once, in order,
// and recorded in the database (DEC on the channels' kept state).

import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { DatabaseSync } from "node:sqlite";

/** A database held in memory, which lasts only as long as the program: for tests. */
export const IN_MEMORY = ":memory:";

/**
 * How long a viewer's values are kept after they were last read or
 * written: the 30 days a session's cookie lasts from the viewer's last
 * connection (DOC-1924, REQ-1040), after which their session cannot come
 * back, so nothing of it can be read again.
 */
export const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;

/** How often, at most, the values of sessions that can no longer come back are deleted, besides at open: an hour. */
const PRUNE_EVERY_MS = 60 * 60 * 1000;

/**
 * The most viewers' values kept at once: four for each session the server
 * holds waiting for its viewer (65,536, DEC-2145), so that a restart that
 * drops every connection together loses none. Past it the values read or
 * written longest ago go first: sessions are made by anyone who connects,
 * so their number is the outside world's to choose, and the file must not
 * grow with it.
 */
export const MOST_SESSION_VALUES = 65_536 * 4;

/** The longest a viewer's value may be as JSON, in UTF-16 code units: with MOST_SESSION_VALUES, the file holds at most about a gigabyte of them. */
export const MOST_SESSION_VALUE_LENGTH = 8192;

/** The longest a shared value may be as JSON: the channel's own records, such as a guestbook, written by the program and few. */
export const MOST_SHARED_VALUE_LENGTH = 1024 * 1024;

/** The longest name a value is kept under. */
export const MOST_NAME_LENGTH = 200;

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
];

/** What is kept where, as a channel's application and its components reach it. */
export interface StateStore {
  /** The shared value kept under `name` at `version`, or undefined: none, or one of another version, which is dropped. */
  shared(name: string, version: number): unknown;
  /** Keeps `value` under `name` at `version`, for every viewer. */
  keepShared(name: string, version: number, value: unknown): void;
  /** The value `session` has kept under `name` at `version`, or undefined: none, or one of another version, which is dropped. */
  ofSession(session: number, name: string, version: number): unknown;
  /** Keeps `value` for `session` under `name` at `version`. */
  keepForSession(session: number, name: string, version: number, value: unknown): void;
}

/** How a store is opened. */
export interface StateStoreOptions {
  /** The real time, in milliseconds since the Unix epoch: Date.now when absent; a test gives its own. */
  readonly now?: () => number;
}

function checkName(name: string): void {
  if (name.length === 0 || name.length > MOST_NAME_LENGTH) {
    throw new RangeError(`a kept value's name is 1 to ${MOST_NAME_LENGTH} characters, not ${name.length}`);
  }
}

function checkVersion(version: number): void {
  if (!Number.isSafeInteger(version) || version < 0) {
    throw new RangeError(`a kept value's version is a whole number from 0, not ${version}`);
  }
}

function checkSession(session: number): void {
  // The server's session numbers are below 2 to the 53rd (DOC-1924), as JSON carries them exactly.
  if (!Number.isSafeInteger(session) || session < 0) {
    throw new RangeError(`a session's number is a whole number from 0, not ${session}`);
  }
}

/** `value` as JSON, refused when it is longer than `most`. */
function jsonOf(value: unknown, most: number): string {
  const text = JSON.stringify(value);
  // JSON.stringify answers undefined for undefined, a function or a symbol: none of them is JSON.
  if (typeof text !== "string") {
    throw new TypeError("a kept value is plain JSON: undefined, a function or a symbol is not");
  }
  if (text.length > most) {
    throw new RangeError(`a kept value is at most ${most} characters as JSON, not ${text.length}`);
  }
  return text;
}

/** The JSON read back, or undefined when the file holds something that is not: dropped as though another version. */
function parsed(text: unknown): unknown {
  if (typeof text !== "string") {
    return undefined;
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/** A row's whole-number column, which a STRICT table holds as an INTEGER. */
function integerOf(row: Record<string, unknown> | undefined, column: string): number | null {
  const value = row?.[column];
  return typeof value === "number" ? value : null;
}

/** A store in a SQLite database at `path`, made with its schema if it is new; IN_MEMORY for one that lasts only as long as the program. */
export class SqliteStateStore implements StateStore {
  readonly #db: DatabaseSync;
  readonly #now: () => number;
  /** How many viewers' values are kept, counted at open and as each is added or deleted. */
  #sessionValues = 0;
  #prunedAt = 0;

  constructor(path: string, options: StateStoreOptions = {}) {
    this.#now = options.now ?? Date.now;
    if (path !== IN_MEMORY) {
      mkdirSync(dirname(path), { recursive: true });
    }
    this.#db = new DatabaseSync(path);
    // The write-ahead log lets a write go without rewriting the file, and NORMAL syncs at each checkpoint: a crash keeps every value written before the last one.
    this.#db.exec("PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA busy_timeout = 1000;");
    this.#migrate();
    this.#sessionValues = integerOf(this.#db.prepare("SELECT count(*) AS n FROM session_value").get(), "n") ?? 0;
    this.#prune();
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
      this.#transaction(() => {
        this.#db.exec(migration);
        record.run(number, this.#now());
      });
    }
  }

  #transaction(work: () => void): void {
    this.#db.exec("BEGIN IMMEDIATE");
    try {
      work();
      this.#db.exec("COMMIT");
    } catch (error) {
      this.#db.exec("ROLLBACK");
      throw error;
    }
  }

  shared(name: string, version: number): unknown {
    checkName(name);
    checkVersion(version);
    const row = this.#db.prepare("SELECT version, value FROM shared_value WHERE name = ?").get(name);
    if (row === undefined) {
      return undefined;
    }
    const value = integerOf(row, "version") === version ? parsed(row["value"]) : undefined;
    if (value === undefined) {
      this.#db.prepare("DELETE FROM shared_value WHERE name = ?").run(name);
    }
    return value;
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

  ofSession(session: number, name: string, version: number): unknown {
    checkSession(session);
    checkName(name);
    checkVersion(version);
    const row = this.#db.prepare("SELECT version, value, touched_ms FROM session_value WHERE session = ? AND name = ?").get(session, name);
    if (row === undefined) {
      return undefined;
    }
    const now = this.#now();
    const live = (integerOf(row, "touched_ms") ?? 0) >= now - SESSION_LIFETIME_MS;
    const value = live && integerOf(row, "version") === version ? parsed(row["value"]) : undefined;
    if (value === undefined) {
      this.#deleteSessionValue(session, name);
      return undefined;
    }
    // Read is used: the session is alive, so its value lasts another lifetime from now.
    this.#db.prepare("UPDATE session_value SET touched_ms = ? WHERE session = ? AND name = ?").run(now, session, name);
    return value;
  }

  keepForSession(session: number, name: string, version: number, value: unknown): void {
    checkSession(session);
    checkName(name);
    checkVersion(version);
    const text = jsonOf(value, MOST_SESSION_VALUE_LENGTH);
    const now = this.#now();
    const updated = this.#db
      .prepare("UPDATE session_value SET version = ?, value = ?, touched_ms = ? WHERE session = ? AND name = ?")
      .run(version, text, now, session, name);
    if (updated.changes === 0) {
      this.#db.prepare("INSERT INTO session_value (session, name, version, value, touched_ms) VALUES (?, ?, ?, ?, ?)").run(session, name, version, text, now);
      this.#sessionValues += 1;
    }
    if (now - this.#prunedAt >= PRUNE_EVERY_MS || this.#sessionValues > MOST_SESSION_VALUES) {
      this.#prune();
    }
  }

  #deleteSessionValue(session: number, name: string): void {
    this.#sessionValues -= Number(this.#db.prepare("DELETE FROM session_value WHERE session = ? AND name = ?").run(session, name).changes);
  }

  /** Deletes the values of sessions that can no longer come back, then the oldest past MOST_SESSION_VALUES. */
  #prune(): void {
    const now = this.#now();
    this.#prunedAt = now;
    this.#sessionValues -= Number(this.#db.prepare("DELETE FROM session_value WHERE touched_ms < ?").run(now - SESSION_LIFETIME_MS).changes);
    const over = this.#sessionValues - MOST_SESSION_VALUES;
    if (over > 0) {
      this.#sessionValues -= Number(
        this.#db.prepare("DELETE FROM session_value WHERE rowid IN (SELECT rowid FROM session_value ORDER BY touched_ms LIMIT ?)").run(over).changes,
      );
    }
  }

  /** How many viewers' values are kept: for tests. */
  get sessionValues(): number {
    return this.#sessionValues;
  }

  /** Closes the database; the store is not used after. */
  close(): void {
    this.#db.close();
  }
}
