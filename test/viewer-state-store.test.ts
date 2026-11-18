// The store's side of viewer state (viewer-state.md VS-405, VS-406): a vote
// and its ballot are one transaction, and the migration drops what was kept
// by a session's number.

import assert from "node:assert/strict";
import { rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

import { type StateStore, SqliteStateStore, Tally } from "../src/index.ts";
import { scratch } from "./viewer-state-fixtures.ts";

test("VS-406: a crash between a vote's two writes leaves the count and the ballot as they were", () => {
  const folder = scratch();
  try {
    const path = join(folder, "state.sqlite");
    const real = new SqliteStateStore(path);
    // The store fails at the ballot's write, as a program killed between the count's and the ballot's would.
    const crashing: StateStore = {
      shared: (name, version) => real.shared(name, version),
      keepShared: (name, version, value) => {
        real.keepShared(name, version, value);
      },
      ofViewer: (viewer, name, version) => real.ofViewer(viewer, name, version),
      keepForViewer: () => {
        throw new Error("killed");
      },
      update: (viewer, name, version, change) => real.update(viewer, name, version, change),
      atomically: (work) => real.atomically(work),
      forgetViewer: (handle) => {
        real.forgetViewer(handle);
      },
      forgetViewers: () => {
        real.forgetViewers();
      },
    };
    const tally = new Tally("best", ["one", "two"], crashing);
    const alice = { handle: "a".repeat(32), remembered: false };
    assert.throws(() => {
      tally.vote({ connection: 1, viewer: alice }, 1);
    }, /killed/u);
    assert.deepEqual(tally.votes, [0, 0], "the count in memory is put back");
    real.close();
    const reopened = new SqliteStateStore(path);
    assert.equal(reopened.shared("poll:best", 1), undefined, "no count was written without its ballot");
    assert.equal(reopened.ofViewer(alice, "poll:best", 1), undefined);
    reopened.close();
  } finally {
    rmSync(folder, { recursive: true });
  }
});

test("VS-405: the migration drops the values kept by session number", () => {
  const folder = scratch();
  try {
    const path = join(folder, "state.sqlite");
    const old = new DatabaseSync(path);
    old.exec(`CREATE TABLE schema_migration (number INTEGER PRIMARY KEY NOT NULL, applied_ms INTEGER NOT NULL) STRICT;
      CREATE TABLE shared_value (name TEXT PRIMARY KEY NOT NULL, version INTEGER NOT NULL, value TEXT NOT NULL) STRICT;
      CREATE TABLE session_value (session INTEGER NOT NULL, name TEXT NOT NULL, version INTEGER NOT NULL, value TEXT NOT NULL, touched_ms INTEGER NOT NULL, PRIMARY KEY (session, name)) STRICT;
      CREATE INDEX session_value_touched ON session_value (touched_ms);
      INSERT INTO schema_migration VALUES (1, 0);
      INSERT INTO shared_value VALUES ('poll:best', 1, '[1,0,0]');
      INSERT INTO session_value VALUES (1, 'poll:best', 1, '0', 0);`);
    old.close();
    new SqliteStateStore(path).close();
    const db = new DatabaseSync(path);
    const tables = db
      .prepare("SELECT name FROM sqlite_schema WHERE type = 'table' ORDER BY name")
      .all()
      .map((row) => row["name"]);
    assert.deepEqual(tables, ["schema_migration", "shared_value", "viewer_value"], "session_value and its rows are gone");
    assert.equal(db.prepare("SELECT value FROM shared_value WHERE name = 'poll:best'").get()?.["value"], "[1,0,0]", "what everyone shares stays");
    db.close();
  } finally {
    rmSync(folder, { recursive: true });
  }
});
