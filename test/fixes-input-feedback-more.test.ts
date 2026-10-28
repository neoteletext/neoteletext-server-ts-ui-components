// Flaws fixed in the feedback part, each test written to fail on the code
// before its fix: a stream's time with room for its length and no bar for
// a stream that failed, a waiting step's mark that is not the cut mark, a
// spinner's words in one column, transport and queue hints that claim no
// keys they do not take, and every progress bar starting in one column.

import assert from "node:assert/strict";
import { test } from "node:test";

import { text } from "neottx-server-ts-protocol/testing";
import {
  CUT_MARK,
  h,
  type Listening,
  ListeningView,
  PlayerView,
  PlayQueue,
  ProgressBar,
  RATE,
  Spinner,
  type Task,
  TaskList,
  Text,
  type Track,
  Transport,
} from "../src/index.ts";
import { MOSAIC_BASE } from "../src/core/mosaics.ts";
import { Attribute } from "../src/kit.ts";
import { PAGE } from "./components-fixtures.ts";
import { codes, drawn, viewer } from "./feedback-more-fixtures.ts";

/** The frame's hint row (frame/frame.ts). */
const HINT_ROW = 23;

/** A stream playing, `heardMs` into `lengthMs`. */
function stream(heardMs: number, lengthMs: number | null, state: Listening["state"] = "playing"): Listening {
  return { name: "Radio 4", heardMs, lengthMs, state, failure: state === "failed" ? "Not found" : null, gain: 100 };
}

// ListeningView.

test("a stream's time shows its length whole, from ten minutes up to hours", () => {
  for (const [heardMs, lengthMs, time] of [
    [754_000, 1_800_000, "12:34/30:00"],
    [3_723_000, 3_723_000, "1:02:03/1:02:03"],
  ] as const) {
    const [, bar] = drawn(viewer(h(ListeningView, { listening: stream(heardMs, lengthMs) })), 2);
    assert.ok(bar?.includes(time) === true, `${time} shows whole`);
    assert.ok(!bar.includes(CUT_MARK), "nothing of it is cut");
  }
});

test("a stream that failed says why and shows no bar, keeping the bar's row so what is under it does not move", () => {
  const rows = drawn(viewer(h(ListeningView, { listening: stream(0, null, "failed") }), h(Text, { text: "Under" })), 3);
  assert.match(rows[0] ?? "", /Cannot play: Not found/u);
  assert.equal(rows[1]?.trim(), "", "no 0:00 and no bar for what never played");
  assert.match(rows[2] ?? "", /Under/u);
});

// TaskList.

test("a waiting step's mark is not the cut mark, so it cannot be read as text cut short", () => {
  const tasks: Task[] = [{ label: "Install", status: "pending" }];
  const [step] = drawn(viewer(h(TaskList, { tasks })), 1);
  assert.ok(!(step ?? "").includes(CUT_MARK));
  assert.equal(step?.slice(1, 3), "- ", "a dash, in the marks' column");
});

// Spinner.

test("a spinner's words start in one column for every style, and once it is done", () => {
  const styles = ["orbit", "bounce", "fill", "dots"] as const;
  const page = viewer(...styles.map((style) => h(Spinner, { key: style, label: "Working", style })), h(Spinner, { key: "done", label: "Working", done: true }));
  const columns = drawn(page, styles.length + 1).map((row) => row.indexOf("Working"));
  assert.equal(new Set(columns).size, 1, `every label in one column: ${columns.join(", ")}`);
});

test("a filling spinner's first frame shows something, not an empty cell", () => {
  const page = viewer(h(Spinner, { label: "Saving", style: "fill" }));
  assert.notEqual(codes(page, 0)[1], MOSAIC_BASE);
});

// Transport and PlayQueue.

/** What a button these tests never press does. */
function nothing(): void {}

/** The transport's buttons' handlers. */
const NO_PRESS = { onPrevious: nothing, onPlayPause: nothing, onStop: nothing, onNext: nothing };

/** The page's hint row. */
function hintOf(page: ReturnType<typeof viewer>): string {
  return text(page.seen(1, PAGE).rows, HINT_ROW);
}

test("a transport on its own claims no keys it does not take: its hint is its buttons'", () => {
  const page = viewer(h(Transport, { going: true, canPlay: true, canStop: true, canStep: false, ...NO_PRESS }));
  assert.doesNotMatch(hintOf(page), /seek|volume/u);
});

test("a play queue on its own claims no seeking it does not do", () => {
  const tracks: Track[] = ["One", "Two"].map((name) => ({
    name,
    source: () => ({ name, rate: RATE, samples: () => new Int16Array(0), complete: true, failure: null, expected: 0 }),
  }));
  const page = viewer(h(PlayQueue, { tracks, queue: [0, 1], current: null, shown: 2, onChoose: () => {} }));
  assert.doesNotMatch(hintOf(page), /seek/u);
});

test("a player's transport says the player's keys, which the player takes", () => {
  const page = viewer(
    h(PlayerView, {
      listening: stream(125_000, 412_000, "paused"),
      queue: [],
      current: null,
      shown: 0,
      levels: null,
      spectrumRows: 0,
      status: { gain: 60, muted: false },
      onSeek: () => {},
      onChoose: () => {},
      onMove: () => {},
      ...NO_PRESS,
    }),
  );
  assert.match(hintOf(page), /seek/u);
});

// ProgressBar.

test("a solid bar and a separated one start their tracks in the same column", () => {
  const labelled = { label: "Battery", value: 3, max: 4 };
  const page = viewer(h(ProgressBar, { key: "solid", ...labelled }), h(ProgressBar, { key: "separated", ...labelled, separated: true }));
  /** The label's column (feedback/progress.ts): the track starts after it. */
  const labelCells = 12;
  const trackStart = (row: number): number => codes(page, row).findIndex((code, at) => at > labelCells && code >= MOSAIC_BASE);
  assert.equal(trackStart(0), trackStart(1));
  assert.deepEqual(
    [0, 1].map((row) => codes(page, row)[labelCells + 1]),
    [Attribute.Contiguous, Attribute.Separated],
    "each spends the cell after its colour on its graphics' kind",
  );
});
