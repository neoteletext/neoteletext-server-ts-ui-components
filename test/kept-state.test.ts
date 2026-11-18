// What outlasts the program: the channel's store (REQ-1057), a poll's votes
// and ballots in it, and a component's kept state (REQ-1058), each kept
// under the viewer's handle (viewer-state.md VS-405) and read back by a
// channel made again on the same database file, as a program started again
// opens it.

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
  type KeptViewer,
  MOST_VIEWER_VALUE_LENGTH,
  MOST_VIEWER_VALUES,
  Poll,
  REMEMBERED_VALUE_IDLE_MS,
  SqliteStateStore,
  Tally,
  Text,
  type KeyEvent,
  VISIT_VALUE_IDLE_MS,
} from "../src/index.ts";
import { Colour, Key } from "../src/kit.ts";

const PAGE = 0x160;

/** A viewer the store is given directly, by a handle of the schema's form. */
const ALICE: KeptViewer = { handle: "a".repeat(32), remembered: false };

/** The `index`th viewer of many, by a handle of 32 hexadecimal digits. */
function viewer(index: number): KeptViewer {
  return { handle: index.toString(16).padStart(32, "0"), remembered: false };
}

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

test("REQ-1058: a component's kept state is given back when it is mounted again for its viewer, after the program starts again", () => {
  const folder = scratch();
  try {
    const path = join(folder, "state.sqlite");
    const before = new SqliteStateStore(path);
    const first = counterChannel(before);
    const tab = first.join(first.viewer("alice"), PAGE);
    first.press(tab, Key.Enter);
    first.press(tab, Key.Enter);
    assert.ok(shows(first.seen(tab, PAGE).rows, "count 2"));
    before.close();

    const after = new SqliteStateStore(path);
    const second = counterChannel(after);
    const again = second.join(second.viewer("alice"), PAGE);
    const other = second.join(second.viewer("bob"), PAGE);
    assert.ok(shows(second.seen(again, PAGE).rows, "count 2"), "the viewer's count is theirs again");
    assert.ok(shows(second.seen(other, PAGE).rows, "count 0"), "another viewer starts from the component's own state");
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
    const alice = first.viewer("alice");
    const tab = first.join(alice, PAGE);
    first.press(tab, Key.Enter);
    before.close();

    const after = new SqliteStateStore(path);
    const second = counterChannel(after, 2);
    const again = second.join(second.viewer("alice"), PAGE);
    assert.ok(shows(second.seen(again, PAGE).rows, "count 0"));
    assert.equal(after.ofViewer(alice, "component:counter", 1), undefined, "the old version's state is gone from the store");
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
    const alice = first.harness.viewer("alice");
    const aliceTab = first.harness.join(alice, PAGE);
    first.harness.press(aliceTab, Key.Enter);
    const bobTab = first.harness.join(first.harness.viewer("bob"), PAGE);
    first.harness.press(bobTab, Key.Down);
    first.harness.press(bobTab, Key.Enter);
    assert.deepEqual(first.tally.votes, [1, 1, 0]);
    before.close();

    const after = new SqliteStateStore(path);
    const second = pollChannel(after);
    assert.deepEqual(second.tally.votes, [1, 1, 0], "the votes are kept");
    const again = second.harness.join(second.harness.viewer("alice"), PAGE);
    assert.equal(second.tally.ballotOf({ connection: again, viewer: alice }), 0, "the viewer's ballot is kept");
    second.harness.press(again, Key.Down);
    second.harness.press(again, Key.Enter);
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
      [1, 2],
    );
    const strict = db.prepare("SELECT name, strict FROM pragma_table_list WHERE schema = 'main' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
    assert.deepEqual(
      strict.map((row) => [row["name"], row["strict"]]),
      [
        ["schema_migration", 1],
        ["shared_value", 1],
        ["viewer_value", 1],
      ],
      "every table is STRICT",
    );
    db.prepare("INSERT INTO schema_migration (number, applied_ms) VALUES (?, ?)").run(3, 0);
    db.close();
    assert.throws(() => new SqliteStateStore(path), /made by a newer program/u);
  } finally {
    rmSync(folder, { recursive: true });
  }
});

test("VS-405: a visit's values go 24 hours after their last use and a remembered viewer's 180 days after, and one too long is refused", () => {
  let now = Date.UTC(2026, 10, 18);
  const store = new SqliteStateStore(":memory:", { now: (): number => now });
  const remembered: KeptViewer = { handle: "b".repeat(32), remembered: true };
  store.keepForViewer(ALICE, "note", 1, { text: "kept" });
  store.keepForViewer(remembered, "note", 1, { text: "remembered" });
  store.keepShared("book", 1, ["signed"]);
  now += VISIT_VALUE_IDLE_MS - 1;
  assert.deepEqual(store.ofViewer(ALICE, "note", 1), { text: "kept" }, "read within the idle limit, and so kept another from now");
  now += VISIT_VALUE_IDLE_MS + 1;
  assert.equal(store.ofViewer(ALICE, "note", 1), undefined, "a visit's value is gone past its idle limit");
  assert.deepEqual(store.ofViewer(remembered, "note", 1), { text: "remembered" }, "a remembered viewer's lasts longer");
  now += REMEMBERED_VALUE_IDLE_MS + 1;
  assert.equal(store.ofViewer(remembered, "note", 1), undefined, "and goes past its own");
  assert.equal(store.viewerValues, 0);
  assert.deepEqual(store.shared("book", 1), ["signed"], "what everyone shares does not expire");
  assert.throws(() => {
    store.keepForViewer(ALICE, "long", 1, "x".repeat(MOST_VIEWER_VALUE_LENGTH));
  }, RangeError);
  assert.throws(
    () => {
      store.keepForViewer({ handle: "7", remembered: false }, "note", 1, 0);
    },
    RangeError,
    "a handle is 32 hexadecimal digits",
  );
  store.close();
});

test("REQ-1057: the viewers' values are bounded, the one read or written longest ago going first", () => {
  let now = Date.UTC(2026, 10, 18);
  const store = new SqliteStateStore(":memory:", { now: (): number => now });
  for (let index = 0; index <= MOST_VIEWER_VALUES; index += 1) {
    now += 1;
    store.keepForViewer(viewer(index), "note", 1, index);
  }
  assert.equal(store.viewerValues, MOST_VIEWER_VALUES);
  assert.equal(store.ofViewer(viewer(0), "note", 1), undefined, "the oldest went");
  assert.equal(store.ofViewer(viewer(1), "note", 1), 1);
  assert.equal(store.ofViewer(viewer(MOST_VIEWER_VALUES), "note", 1), MOST_VIEWER_VALUES);
  store.close();
});
