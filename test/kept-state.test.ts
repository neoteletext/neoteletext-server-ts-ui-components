// What outlasts the program: the channel's store (REQ-1057), a poll's votes
// and ballots in it, and a component's kept state (REQ-1058), each read
// back by a channel made again on the same database file, as a program
// started again opens it.

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";

import { fakeOpus, Harness, shows } from "neoteletext-server-ts-protocol/testing";
import {
  type Child,
  Component,
  ComponentChannel,
  type Element,
  Frame,
  h,
  isPress,
  type KeptAs,
  MOST_SESSION_VALUE_LENGTH,
  MOST_SESSION_VALUES,
  Poll,
  SESSION_LIFETIME_MS,
  SqliteStateStore,
  Tally,
  Text,
  type KeyEvent,
} from "../src/index.ts";
import { Colour, Key } from "../src/kit.ts";

const PAGE = 0x160;
const VIEWER = 7;
const OTHER = 8;

/** A folder of its own for each test's database, in the repository's ignored tmp/. */
function scratch(): string {
  const root = join(import.meta.dirname, "..", "tmp");
  mkdirSync(root, { recursive: true });
  return mkdtempSync(join(root, "kept-state-"));
}

/** A count Enter raises, kept for its viewer at the version its props give. */
class KeptCounter extends Component<{ readonly version: number }, { readonly count: number }> {
  override state = { count: 0 };

  override focusable(): boolean {
    return true;
  }

  override keptAs(): KeptAs {
    return { key: "counter", version: this.props.version };
  }

  override render(): Child {
    return h(Text, { text: `count ${this.state.count}` });
  }

  override onKey(event: KeyEvent): boolean {
    if (!isPress(event, Key.Enter)) {
      return false;
    }
    this.setState({ count: this.state.count + 1 });
    return true;
  }
}

/** A program of the counter's page on `store`, as it is each time it starts. */
function counterChannel(store: SqliteStateStore, version = 1): Harness {
  return new Harness([
    new ComponentChannel(
      [
        {
          page: PAGE,
          title: "Counter",
          perViewer: true,
          root: (): Element => h(Frame, { title: "Counter", background: Colour.Blue }, h(KeptCounter, { version })),
        },
      ],
      { opus: fakeOpus(), state: store },
    ),
  ]);
}

test("REQ-1058: a component's kept state is given back when it is mounted again for its session, after the program starts again", () => {
  const folder = scratch();
  try {
    const path = join(folder, "state.sqlite");
    const before = new SqliteStateStore(path);
    const first = counterChannel(before);
    first.join(VIEWER, PAGE);
    first.press(VIEWER, Key.Enter);
    first.press(VIEWER, Key.Enter);
    assert.ok(shows(first.seen(VIEWER, PAGE).rows, "count 2"));
    before.close();

    const after = new SqliteStateStore(path);
    const second = counterChannel(after);
    second.join(VIEWER, PAGE);
    second.join(OTHER, PAGE);
    assert.ok(shows(second.seen(VIEWER, PAGE).rows, "count 2"), "the viewer's count is theirs again");
    assert.ok(shows(second.seen(OTHER, PAGE).rows, "count 0"), "another viewer starts from the component's own state");
    assert.deepEqual(second.errors, []);
    after.close();
  } finally {
    rmSync(folder, { recursive: true });
  }
});

test("REQ-1058: kept state of another version is dropped, and the component starts from its own", () => {
  const folder = scratch();
  try {
    const path = join(folder, "state.sqlite");
    const before = new SqliteStateStore(path);
    const first = counterChannel(before, 1);
    first.join(VIEWER, PAGE);
    first.press(VIEWER, Key.Enter);
    before.close();

    const after = new SqliteStateStore(path);
    const second = counterChannel(after, 2);
    second.join(VIEWER, PAGE);
    assert.ok(shows(second.seen(VIEWER, PAGE).rows, "count 0"));
    assert.equal(after.ofSession(VIEWER, "component:counter", 1), undefined, "the old version's state is gone from the store");
    after.close();
  } finally {
    rmSync(folder, { recursive: true });
  }
});

test("REQ-1057: a poll's votes and each viewer's ballot are there after the program starts again", () => {
  const folder = scratch();
  try {
    const path = join(folder, "state.sqlite");
    const pollChannel = (store: SqliteStateStore): { harness: Harness; tally: Tally } => {
      const tally = new Tally("best", ["one", "two", "three"], store);
      const harness = new Harness([
        new ComponentChannel(
          [{ page: PAGE, title: "Poll", perViewer: true, root: (): Element => h(Frame, { title: "Poll", background: Colour.Blue }, h(Poll, { tally })) }],
          {
            opus: fakeOpus(),
            state: store,
          },
        ),
      ]);
      return { harness, tally };
    };
    const before = new SqliteStateStore(path);
    const first = pollChannel(before);
    first.harness.join(VIEWER, PAGE);
    first.harness.press(VIEWER, Key.Enter);
    first.harness.join(OTHER, PAGE);
    first.harness.press(OTHER, Key.Down);
    first.harness.press(OTHER, Key.Enter);
    assert.deepEqual(first.tally.votes, [1, 1, 0]);
    before.close();

    const after = new SqliteStateStore(path);
    const second = pollChannel(after);
    assert.deepEqual(second.tally.votes, [1, 1, 0], "the votes are kept");
    second.harness.join(VIEWER, PAGE);
    assert.equal(second.tally.ballotOf(VIEWER), 0, "the viewer's ballot is kept");
    second.harness.press(VIEWER, Key.Down);
    second.harness.press(VIEWER, Key.Enter);
    assert.deepEqual(second.tally.votes, [0, 2, 0], "the viewer's vote moved, never cast again");
    after.close();
  } finally {
    rmSync(folder, { recursive: true });
  }
});

test("REQ-1057: the schema is made by numbered migrations, each applied once, and a newer database is refused", () => {
  const folder = scratch();
  try {
    const path = join(folder, "state.sqlite");
    new SqliteStateStore(path).close();
    new SqliteStateStore(path).close();
    const db = new DatabaseSync(path);
    assert.deepEqual(
      db
        .prepare("SELECT number FROM schema_migration ORDER BY number")
        .all()
        .map((row) => row["number"]),
      [1],
    );
    const strict = db.prepare("SELECT name, strict FROM pragma_table_list WHERE schema = 'main' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    assert.deepEqual(
      strict.map((row) => [row["name"], row["strict"]]),
      [
        ["schema_migration", 1],
        ["session_value", 1],
        ["shared_value", 1],
      ],
      "every table is STRICT",
    );
    db.prepare("INSERT INTO schema_migration (number, applied_ms) VALUES (?, ?)").run(2, 0);
    db.close();
    assert.throws(() => new SqliteStateStore(path), /made by a newer program/u);
  } finally {
    rmSync(folder, { recursive: true });
  }
});

test("REQ-1057: a viewer's values go once their session can no longer come back, and one too long is refused", () => {
  let now = Date.UTC(2026, 10, 4);
  const store = new SqliteStateStore(":memory:", { now: (): number => now });
  store.keepForSession(VIEWER, "note", 1, { text: "kept" });
  store.keepShared("book", 1, ["signed"]);
  now += SESSION_LIFETIME_MS - 1;
  assert.deepEqual(store.ofSession(VIEWER, "note", 1), { text: "kept" }, "read within the lifetime, and so kept another lifetime");
  now += SESSION_LIFETIME_MS + 1;
  assert.equal(store.ofSession(VIEWER, "note", 1), undefined);
  assert.equal(store.sessionValues, 0);
  assert.deepEqual(store.shared("book", 1), ["signed"], "what everyone shares does not expire");
  assert.throws(() => {
    store.keepForSession(VIEWER, "long", 1, "x".repeat(MOST_SESSION_VALUE_LENGTH));
  }, RangeError);
  assert.throws(() => {
    store.keepForSession(-1, "note", 1, 0);
  }, RangeError);
  store.close();
});

test("REQ-1057: the viewers' values are bounded, the one read or written longest ago going first", () => {
  let now = Date.UTC(2026, 10, 4);
  const store = new SqliteStateStore(":memory:", { now: (): number => now });
  for (let session = 0; session <= MOST_SESSION_VALUES; session += 1) {
    now += 1;
    store.keepForSession(session, "note", 1, session);
  }
  assert.equal(store.sessionValues, MOST_SESSION_VALUES);
  assert.equal(store.ofSession(0, "note", 1), undefined, "the oldest went");
  assert.equal(store.ofSession(1, "note", 1), 1);
  assert.equal(store.ofSession(MOST_SESSION_VALUES, "note", 1), MOST_SESSION_VALUES);
  store.close();
});
