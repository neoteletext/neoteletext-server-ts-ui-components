// Snapshots (REQ-6903; tab-thumbnails.md section 7.4): the kit runs a
// page's selection for a stranger on a connection of its own, and the
// library draws that page as for someone who has just arrived: no viewer,
// no parameters, no kept viewer's state, and nothing beyond drawing (no
// state asked for, no sound, no stream, no language). The kit answers the
// server with what was drawn; these tests read that answer.

// oxlint-disable max-lines -- one test of each of REQ-6903's verification list, and the catalogue's
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { fakeOpus, Harness, type Sent, shows } from "neoteletext-server-ts-protocol/testing";
import {
  type Child,
  Component,
  ComponentChannel,
  type Element,
  Frame,
  h,
  isPress,
  type KeptAs,
  type KeyEvent,
  type PageParams,
  Rows as RowsLayout,
  sound,
  SqliteStateStore,
  type StreamSource,
  Text,
  tone,
} from "../src/index.ts";
import { Colour, COLUMNS, Key, type OpusEncoder, SPACE } from "../src/kit.ts";
import { frame, PAGE } from "./components-fixtures.ts";
import { exampleName } from "./catalogue/example.ts";
import { PARTS } from "./catalogue/index.ts";

/** The kit numbers its first snapshot 1 and draws it on connection -1 (REQ-6901 item 1). */
const FIRST_SNAPSHOT_CONNECTION = -1;
/** Forbidden: how a page closed to strangers denies one (DOC-1961). */
const FORBIDDEN = 403;
/** A short sound's length and pitch, for the sound a page plays as it is opened. */
const CHIME_MS = 50;
const CHIME_HZ = 880;
/** A timer's period, and how long the clock is run on after a snapshot to see whether its timer still runs. */
const TICK_MS = 100;
const AFTER_MS = 1_000;

/** An object field of a line as its fields; none when it is not an object. */
function fieldsOf(value: unknown): Readonly<Record<string, unknown>> {
  return typeof value === "object" && value !== null && !Array.isArray(value) ? Object.fromEntries(Object.entries(value)) : {};
}

/** A line's page's rows as codes, a blank row as spaces, as the server writes them (base64, null for blank). */
function rowsOfLine(line: Sent): number[][] {
  const rows: unknown = fieldsOf(line["page"])["rows"];
  return (Array.isArray(rows) ? rows : []).map((row: unknown) =>
    typeof row === "string" ? Array.from(Buffer.from(row, "base64")) : Array.from({ length: COLUMNS }, () => SPACE),
  );
}

/** A field of a line's page, such as its sub-code. */
function pageField(line: Sent, name: string): unknown {
  return fieldsOf(line["page"])[name];
}

/** The answer's type: `snapshot_page` or `snapshot_declined`. */
function typeOf(line: Sent): unknown {
  return line["type"];
}

/** A folder of its own for each test's database, in the repository's ignored tmp/. */
function scratch(): string {
  const root = join(import.meta.dirname, "..", "tmp");
  mkdirSync(root, { recursive: true });
  return mkdtempSync(join(root, "snapshot-"));
}

/** A count Enter raises, kept for its viewer (REQ-1058). */
class KeptCounter extends Component<Record<string, never>, { readonly count: number }> {
  override state = { count: 0 };

  override focusable(): boolean {
    return true;
  }

  override keptAs(): KeptAs {
    return { key: "counter", version: 1 };
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

/** What a page's own copy did as it was mounted, for a test to read. */
interface Effects {
  /** Each copy's connection and whether the services called it a snapshot's. */
  readonly snapshots: [number, boolean][];
  /** The viewer each copy's services gave. */
  readonly viewers: unknown[];
  /** Timer ticks on copies drawn for a connection. */
  ticks: number;
}

function noEffects(): Effects {
  return { snapshots: [], viewers: [], ticks: 0 };
}

/** A source of a stream whose samples are all known: a second of tone. */
function toneSource(): StreamSource {
  const samples = tone(CHIME_HZ, AFTER_MS);
  return { name: "tone", rate: 8_000, samples: () => samples, complete: true, failure: null, expected: samples.length };
}

/** On a copy drawn for a connection, as it is mounted: everything a component might do for a viewer that has just arrived. */
class Eager extends Component<{ readonly effects: Effects }> {
  override needs(): { ownCopy: boolean } {
    return { ownCopy: true };
  }

  override componentDidMount(): void {
    const { connection } = this.services;
    if (connection === null) {
      return;
    }
    const { effects } = this.props;
    effects.snapshots.push([connection, this.services.isSnapshot(connection)]);
    effects.viewers.push(this.services.viewer(connection));
    this.services.wantState(connection);
    this.services.offerRemember(connection);
    this.services.setLanguage(connection, "fr");
    this.services.play(sound("chime", tone(CHIME_HZ, CHIME_MS)), connection);
    this.services.play(sound("chime-to-the-copy", tone(CHIME_HZ, CHIME_MS)));
    this.services.stream(toneSource(), connection);
    this.setInterval(() => {
      effects.ticks += 1;
    }, TICK_MS);
  }

  override render(): Child {
    return h(Text, { text: "eager" });
  }
}

/** An encoder that counts what it is asked to encode, over the kit's fake. */
function countingOpus(): { readonly encoder: OpusEncoder; readonly counts: { sounds: number; streams: number } } {
  const inner = fakeOpus();
  const counts = { sounds: 0, streams: 0 };
  return {
    counts,
    encoder: {
      sound: (samples, rate) => {
        counts.sounds += 1;
        return inner.sound(samples, rate);
      },
      stream: (rate) => {
        counts.streams += 1;
        return inner.stream(rate);
      },
    },
  };
}

test("REQ-6903: a_snapshot_of_a_page_with_kept_components_shows_their_defaults_not_a_viewers_state", () => {
  const folder = scratch();
  try {
    const store = new SqliteStateStore(join(folder, "state.sqlite"));
    const harness = new Harness([
      new ComponentChannel(
        [{ page: PAGE, title: "Counter", perViewer: true, root: (): Element => h(Frame, { title: "Counter", background: Colour.Blue }, h(KeptCounter, {})) }],
        { opus: fakeOpus(), state: store },
      ),
    ]);
    const alice = harness.viewer("alice");
    const tab = harness.join(alice, PAGE);
    harness.press(tab, Key.Enter);
    harness.press(tab, Key.Enter);
    assert.ok(shows(harness.seen(tab, PAGE).rows, "count 2"), "the viewer's count is kept");
    assert.deepEqual(store.ofViewer(alice, "component:counter", 1), { count: 2 }, "and stored under their handle");

    const answer = harness.snapshot(PAGE);
    assert.equal(typeOf(answer), "snapshot_page");
    assert.ok(shows(rowsOfLine(answer), "count 0"), "the snapshot shows the component's own start");
    assert.ok(!shows(rowsOfLine(answer), "count 2"), "and nothing of the viewer's");
    assert.deepEqual(harness.errors, []);
    store.close();
  } finally {
    rmSync(folder, { recursive: true });
  }
});

test("REQ-6903: a_snapshot_mount_has_no_parameters", () => {
  const made: (PageParams | undefined)[] = [];
  const harness = new Harness([
    new ComponentChannel(
      [
        {
          page: PAGE,
          title: "Article",
          perViewer: true,
          root: (params?: PageParams): Element => {
            made.push(params);
            return frame("Article", h(Text, { text: `article ${String(params?.["id"] ?? "none")}` }));
          },
        },
      ],
      { opus: fakeOpus() },
    ),
  ]);
  const tab = harness.join(1, PAGE);
  harness.open(tab, PAGE, undefined, "id=7");
  assert.ok(shows(harness.seen(tab, PAGE).rows, "article 7"), "the viewer's copy is made with their query");

  made.length = 0;
  const answer = harness.snapshot(PAGE);
  assert.equal(typeOf(answer), "snapshot_page");
  assert.ok(shows(rowsOfLine(answer), "article none"), "the snapshot's copy is made with none");
  assert.deepEqual(made, [undefined], "its root was made once, with no parameters");
});

test("REQ-6903: a_snapshot_never_asks_for_viewer_state_or_plays_sound", () => {
  const effects = noEffects();
  const { encoder, counts } = countingOpus();
  const harness = new Harness([
    new ComponentChannel([{ page: PAGE, title: "Eager", perViewer: true, root: (): Element => frame("Eager", h(Eager, { effects })) }], { opus: encoder }),
  ]);
  const before = harness.sent.length;
  const answer = harness.snapshot(PAGE);
  assert.equal(typeOf(answer), "snapshot_page");
  assert.deepEqual(
    harness.sent.slice(before).map((line) => typeOf(line)),
    ["snapshot_page"],
    "nothing but the answer is written: no state request, no offer, no sound",
  );
  assert.deepEqual(counts, { sounds: 0, streams: 0 }, "no sound or stream was even encoded for it");
  assert.deepEqual(effects.viewers, [null], "the snapshot's copy has no viewer");

  // The same page for a viewer does all of it: what the snapshot skipped is there to skip.
  const tab = harness.join(1, PAGE);
  assert.ok(counts.sounds > 0 && counts.streams > 0, "a viewer's copy plays and streams");
  assert.ok(harness.sounds(tab).length > 0);
  assert.deepEqual(harness.errors, []);
});

test("REQ-6903: a_page_that_denies_strangers_in_its_render_is_declined", () => {
  /** Members only: a connection with no viewer is denied as it is drawn. */
  class MembersOnly extends Component {
    override needs(): { ownCopy: boolean } {
      return { ownCopy: true };
    }

    override componentDidMount(): void {
      const { connection } = this.services;
      if (connection !== null && this.services.viewer(connection) === null) {
        this.services.deny(connection, FORBIDDEN);
      }
    }

    override render(): Child {
      return h(Text, { text: "members' news" });
    }
  }
  const harness = new Harness([
    new ComponentChannel([{ page: PAGE, title: "Members", perViewer: true, root: (): Element => frame("Members", h(MembersOnly, {})) }], { opus: fakeOpus() }),
  ]);
  const answer = harness.snapshot(PAGE);
  assert.equal(typeOf(answer), "snapshot_declined");
  assert.equal(answer["page"], undefined, "no page is carried");
});

test("REQ-6903: snapshots_false_on_a_page_spec_declines_it", () => {
  let roots = 0;
  const channel = new ComponentChannel(
    [
      {
        page: PAGE,
        title: "Private",
        perViewer: true,
        snapshots: false,
        root: (): Element => {
          roots += 1;
          return frame("Private", h(Text, { text: "private" }));
        },
      },
    ],
    { opus: fakeOpus() },
  );
  assert.equal(channel.pages()[0]?.snapshots, false, "the kit's entry says so");
  const harness = new Harness([channel]);
  const made = roots;
  assert.equal(typeOf(harness.snapshot(PAGE)), "snapshot_declined");
  assert.equal(roots, made, "nothing was drawn for it");
});

test("REQ-6903: a page spec that says nothing of snapshots leaves the kit's entry to its default", () => {
  const channel = new ComponentChannel([{ page: PAGE, title: "Open", root: (): Element => frame("Open", h(Text, { text: "open" })) }], { opus: fakeOpus() });
  assert.equal(channel.pages()[0]?.snapshots, undefined);
  assert.equal(typeOf(new Harness([channel]).snapshot(PAGE)), "snapshot_page");
});

/** Drawn one way on the channel's copy and another on a connection's, so that a connection's copy is its own. */
class EachCopy extends Component {
  override needs(): { ownCopy: boolean } {
    return { ownCopy: true };
  }

  override render(): Child {
    return h(Text, { text: this.services.connection === null ? "the channel's copy" : "a copy of its own" });
  }
}

test("REQ-6903: a_picture_page_is_pictured_with_its_picture", () => {
  for (const renderer of ["regis", "naplps"] as const) {
    // A page with a copy of each viewer's: drawn for the snapshot's connection, its picture is sent to that connection alone and carried.
    const own = new Harness([
      new ComponentChannel([{ page: PAGE, title: "Own", renderer, perViewer: true, root: (): Element => frame("Own", h(EachCopy, {})) }], {
        opus: fakeOpus(),
      }),
    ]);
    const ownAnswer = own.snapshot(PAGE);
    assert.equal(typeOf(ownAnswer), "snapshot_page", renderer);
    const picture = fieldsOf(ownAnswer["picture"]);
    assert.equal(picture["language"], renderer, `${renderer}: the snapshot's own picture is carried`);
    assert.ok(picture["data"] !== undefined || picture["parts"] !== undefined, `${renderer}: with its bytes`);
    assert.ok(shows(rowsOfLine(ownAnswer), "a copy of its own"), `${renderer}: of the snapshot's own copy`);

    // A page every viewer shares: answered from the channel's copy, named by its kept picture.
    const shared = new Harness([
      new ComponentChannel([{ page: PAGE, title: "Shared", renderer, root: (): Element => frame("Shared", h(Text, { text: "a picture for all" })) }], {
        opus: fakeOpus(),
      }),
    ]);
    const sharedAnswer = shared.snapshot(PAGE);
    assert.equal(typeOf(sharedAnswer), "snapshot_page", renderer);
    assert.deepEqual(sharedAnswer["picture"], { kept: pageField(sharedAnswer, "sub") }, `${renderer}: the channel's kept picture of the answered sub-page`);
    assert.deepEqual([own.errors, shared.errors], [[], []]);
  }
});

test("REQ-6903: a_snapshot_connections_mounts_are_gone_after_its_answer", () => {
  const effects = noEffects();
  const channel = new ComponentChannel(
    [{ page: PAGE, title: "Eager", perViewer: true, keepWhileAway: true, root: (): Element => frame("Eager", h(Eager, { effects })) }],
    { opus: fakeOpus() },
  );
  const harness = new Harness([channel]);
  assert.equal(typeOf(harness.snapshot(PAGE)), "snapshot_page");
  assert.equal(channel.viewerMount(FIRST_SNAPSHOT_CONNECTION, PAGE), undefined, "no mount is kept for it, even on a page kept while away");
  harness.advance(AFTER_MS);
  harness.runUntil(harness.now + AFTER_MS);
  assert.equal(effects.ticks, 0, "its timer stopped with it");
});

test("REQ-6903: services_is_snapshot_is_true_only_for_a_snapshot_connection", () => {
  const effects = noEffects();
  const harness = new Harness([
    new ComponentChannel([{ page: PAGE, title: "Eager", perViewer: true, root: (): Element => frame("Eager", h(Eager, { effects })) }], { opus: fakeOpus() }),
  ]);
  const tab = harness.join(1, PAGE);
  assert.equal(typeOf(harness.snapshot(PAGE)), "snapshot_page");
  assert.deepEqual(effects.snapshots, [
    [tab, false],
    [FIRST_SNAPSHOT_CONNECTION, true],
  ]);
});

/** The rows a stranger's page is drawn with, staged as the catalogue's checks stage it. */
function exampleChannel(example: (typeof PARTS)[number]["examples"][number]): ComponentChannel {
  return new ComponentChannel(
    [
      {
        page: PAGE,
        title: example.component,
        perViewer: true,
        root: (): Element => (example.whole === true ? h(RowsLayout, {}, example.build()) : frame(example.component, example.build())),
      },
      ...(example.pages ?? []),
    ],
    { opus: fakeOpus() },
  );
}

/** The first sub-page `connection` would be shown of the page: its own copy's, else the channel's. */
function firstSeen(harness: Harness, connection: number): readonly (readonly number[])[] {
  const pages = harness.ownPages(connection, PAGE) ?? harness.sharedPages(PAGE);
  const [first] = pages;
  assert.ok(first !== undefined);
  return first.rows;
}

test("REQ-6903: a snapshot of every catalogue example holds nothing a viewer's state put there", () => {
  const changed: string[] = [];
  for (const part of PARTS) {
    for (const example of part.examples) {
      const name = `${part.part}: ${exampleName(example)}`;
      const harness = new Harness([exampleChannel(example)]);
      const viewer = harness.join(1, PAGE);
      example.act?.(harness);
      const answer = harness.snapshot(PAGE);
      assert.equal(typeOf(answer), "snapshot_page", name);
      const snapshot = rowsOfLine(answer);
      // Two strangers who arrive now see what the snapshot is to show; a row they see differently is drawn afresh for each copy (a code
      // chosen at random), so it is no viewer's.
      const first = firstSeen(harness, harness.join(2, PAGE));
      const second = firstSeen(harness, harness.join(3, PAGE));
      const rows = first.flatMap((row, index) => (JSON.stringify(row) === JSON.stringify(second[index]) ? [index] : []));
      for (const row of rows) {
        assert.deepEqual(snapshot[row], first[row], `${name}: row ${row} is a stranger's`);
      }
      const theirs = firstSeen(harness, viewer);
      if (rows.some((row) => JSON.stringify(theirs[row]) !== JSON.stringify(first[row]))) {
        changed.push(exampleName(example));
      }
      assert.deepEqual(harness.errors, [], name);
    }
  }
  // The examples whose viewer changed what they see, by typing, choosing or moving: in each the snapshot held none of it.
  assert.ok(changed.includes("textfield-masked-typed-in"), "the typing is absent");
  assert.ok(changed.includes("typetoconfirm-with-the-name-typed"), "the name typed is absent");
  assert.ok(changed.includes("checkbox-ticked-not-and-mixed"));
});
