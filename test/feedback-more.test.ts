// The stopwatch, large text, metric cards, task lists, progress lists,
// loading and skeletons: what each draws, and how it moves with the keys
// and the clock.

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, shows } from "neoteletext-server-ts-protocol/testing";
import {
  BigDigits,
  BigText,
  ComponentChannel,
  type Element,
  h,
  Loading,
  MetricCard,
  type MetricCardProps,
  ProgressList,
  Skeleton,
  Stopwatch,
  Switch,
  type Task,
  TaskList,
} from "../src/index.ts";
import { FULL_BLOCK, MOSAIC_BASE, SIXEL } from "../src/core/mosaics.ts";
import { BIG_LETTERS } from "../src/text/big-text.ts";
import { Attribute, Colour, Key, mosaicColour, SPACE_CODE, textColour } from "../src/kit.ts";
import { frame, harness, PAGE } from "./components-fixtures.ts";
import { codes, drawn, heard, large, Loader, viewer, wait } from "./feedback-more-fixtures.ts";

/** A spinner's and a shimmer's step when not told, in milliseconds. */
const STEP_MS = 250;
/** The cells before a skeleton's blocks: its colour, Separated, Hold Mosaics. */
const SKELETON_LEAD = 3;

// The stopwatch.

test("a stopwatch starts and stops on Enter, counts whole seconds off the clock, takes laps, the latest first, and resets on Escape", () => {
  const seen = viewer(h(Stopwatch, { label: "Race" }));
  assert.match(drawn(seen, 1)[0] ?? "", />Race  STOPPED/u, "it has the keys, and says it is stopped in words");
  assert.match(drawn(seen, 1, 1)[0] ?? "", /0:00/u);
  seen.press(1, Key.Enter);
  assert.match(drawn(seen, 1)[0] ?? "", /RUNNING/u);
  wait(seen, 3_500);
  assert.match(drawn(seen, 1, 1)[0] ?? "", /0:03/u, "three whole seconds: half of one is not shown as a second");
  seen.press(1, "l");
  wait(seen, 2_000);
  seen.press(1, "L");
  const [lap2, lap1] = drawn(seen, 2, 2);
  assert.match(lap2 ?? "", /Lap 2 {2}0:02 {2}at 0:05/u, "the latest lap first, its own time and the time at its end");
  assert.match(lap1 ?? "", /Lap 1 {2}0:03 {2}at 0:03/u);
  seen.press(1, " ");
  assert.match(drawn(seen, 1)[0] ?? "", /STOPPED/u, "Space stops it as Enter does");
  wait(seen, 5_000);
  assert.match(drawn(seen, 1, 1)[0] ?? "", /0:05/u, "stopped, its time stays");
  seen.press(1, Key.Enter);
  wait(seen, 1_000);
  assert.match(drawn(seen, 1, 1)[0] ?? "", /0:06/u, "started again, it goes on from where it stopped");
  seen.press(1, Key.Escape);
  assert.deepEqual(
    drawn(seen, 3).map((row) => row.trim()),
    drawn(viewer(h(Stopwatch, { label: "Race" })), 3).map((row) => row.trim()),
    "reset: stopped at nought, with no laps, as a new one",
  );
});

test("a stopwatch keeps only its most laps, and takes no lap while it is stopped", () => {
  const seen = viewer(h(Stopwatch, { mostLaps: 2 }));
  seen.press(1, "l");
  assert.ok(!shows(seen.seen(1, PAGE).rows, "Lap"), "no lap while stopped");
  seen.press(1, Key.Enter);
  for (let lap = 0; lap < 3; lap += 1) {
    wait(seen, 1_000);
    seen.press(1, "l");
  }
  const rows = seen.seen(1, PAGE).rows;
  assert.deepEqual(
    ["Lap 1", "Lap 2", "Lap 3"].map((lap) => shows(rows, lap)),
    [false, true, true],
  );
});

test("a stopwatch in large digits draws its time as large digits do", () => {
  const seen = viewer(h(Stopwatch, { big: true, foreground: Colour.Green }));
  seen.press(1, Key.Enter);
  wait(seen, 3_000);
  assert.deepEqual(drawn(seen, 3, 1), large(BigDigits, "0:03"));
});

// Large text.

test("large text draws its digits as large digits do, small letters as capitals, and a character it has no letter for as a blank as wide", () => {
  assert.deepEqual(large(BigText, "12:30"), large(BigDigits, "12:30"));
  assert.deepEqual(large(BigText, "teletext"), large(BigText, "TELETEXT"));
  assert.deepEqual(large(BigText, "A~B"), large(BigText, "A B"), "an unknown character is a blank");
  assert.notDeepEqual(large(BigText, "A~B"), large(BigText, "AB"), "as wide as a letter");
});

test("large text fits whole letters to its width, cutting the rest", () => {
  // In 20 cells: the colour's cell, then 38 sixels, six letters of six with the last one's gap not needed.
  assert.deepEqual(large(BigText, "ABCDEFGHIJ", 20), large(BigText, "ABCDEF", 20));
  assert.notDeepEqual(large(BigText, "ABCDEFG"), large(BigText, "ABCDEF"), "with the room, the seventh is drawn");
});

test("every large letter is the large digits' size: seven rows of five sixels, each set or clear", () => {
  for (const [letter, rows] of Object.entries(BIG_LETTERS)) {
    assert.equal(rows.length, 7, letter);
    for (const row of rows) {
      assert.match(row, /^[#.]{5}$/u, letter);
    }
  }
});

// Metric cards.

/** An uptime card's heading and figure rows. */
function card(props: Pick<MetricCardProps, "value" | "previous" | "decimals">): string[] {
  return drawn(viewer(h(MetricCard, { label: "Uptime", kind: "success", unit: "%", ...props })), 2);
}

/** A skeleton's line of `blocks`, in its colour when not told. */
function line(blocks: number): number[] {
  return [mosaicColour(Colour.Blue), Attribute.Separated, Attribute.HoldMosaics, ...Array.from({ length: blocks }, () => FULL_BLOCK), Attribute.ReleaseMosaics];
}

test("a metric card says its health by its kind's mark, its value, and its change by a mark and the amount", () => {
  const [heading, up] = card({ value: 99.5, previous: 99, decimals: 1 });
  assert.match(heading ?? "", /OK.*Uptime/u, "the kind's mark before the label");
  assert.match(up ?? "", /99\.5% {2}\+0\.5/u);
  assert.match(card({ value: 3, previous: 5 })[1] ?? "", /3% {2}-2/u);
  assert.match(card({ value: 5, previous: 5 })[1] ?? "", /5% {2}=0/u);
  assert.match(card({ value: 5.2, previous: 5 })[1] ?? "", /5% {2}=0/u, "a move too small to show at its places is none");
  assert.match(card({ value: Number.NaN, previous: 5 })[1] ?? "", /--% {2}--/u, "no number, no figure and no change");
  assert.match(card({ value: 42 })[1] ?? "", /^\S42% *$/u, "with nothing before, no change");
  assert.match(card({ value: 1, decimals: 1_000 })[1] ?? "", /1\.0{6}%/u, "places bounded, where toFixed would throw");
});

test("a metric card's figure in large text is in its kind's colour, its change beneath, and its history a sparkline under that", () => {
  const seen = viewer(h(MetricCard, { label: "Errors", kind: "error", value: 42, previous: 40, big: true, history: [1, 3, 2] }));
  assert.deepEqual(drawn(seen, 3, 1), drawn(viewer(h(BigText, { text: "42", foreground: Colour.Red })), 3));
  assert.match(drawn(seen, 1, 4)[0] ?? "", /\+2/u);
  assert.equal(codes(seen, 5)[0], mosaicColour(Colour.Red), "the sparkline in the kind's colour");
});

// Task lists.

test("a task list marks each step in words in its kind's colour, spins the running one, and says why a failed one failed under it", () => {
  const tasks: Task[] = [
    { label: "Fetch", status: "done" },
    { label: "Build", status: "running" },
    { label: "Test", status: "failed", reason: "2 failing" },
    { label: "Ship", status: "pending" },
  ];
  const seen = viewer(h(TaskList, { tasks }));
  const rows = drawn(seen, 5);
  // Each row: the mark's colour, the mark, the label's colour in the label's column, the label.
  assert.deepEqual(
    rows.map((row) => [row.slice(1, 3), row.slice(4).trimEnd()]),
    [
      ["OK", "Fetch"],
      // The spinner's frame, and the next of its frames' cells, blank, cut at the marks' column.
      [String.fromCodePoint(MOSAIC_BASE | SIXEL.topLeft, MOSAIC_BASE), "Build"],
      ["X ", "Test"],
      ["  ", "2 failing"],
      ["- ", "Ship"],
    ],
  );
  assert.deepEqual(
    [0, 1, 2, 3].map((row) => codes(seen, row)[0]),
    [textColour(Colour.Green), mosaicColour(Colour.Cyan), textColour(Colour.Red), textColour(Colour.White)],
    "done green, running cyan, failed red, the reason's row's empty mark",
  );
  wait(seen, STEP_MS);
  assert.equal(codes(seen, 1)[1], MOSAIC_BASE | SIXEL.topRight, "the spinner moved on");
});

// Progress lists.

test("a progress list estimates each bar's rate and time left from when it started, and says -- while either is not known", () => {
  let startedMs = 0;
  const seen = harness([
    {
      page: PAGE,
      title: "Test",
      perViewer: true,
      root: (): Element =>
        frame(
          "Test",
          h(ProgressList, {
            items: [
              { label: "Copy", value: 50, max: 100, startedMs },
              { label: "Wait", value: 0, max: 10, startedMs },
              { label: "Idle", value: 3, max: 10 },
            ],
          }),
        ),
    },
  ]);
  startedMs = seen.now;
  seen.join(1, PAGE);
  assert.match(drawn(seen, 1)[0] ?? "", /50%. +-- +--/u, "no time has passed");
  wait(seen, 10_000);
  const [copy, waiting, idle] = drawn(seen, 3);
  assert.match(copy ?? "", /Copy.*50%. +5\.0\/s +0:10 *$/u);
  assert.match(waiting ?? "", / 0%. +0\.0\/s +-- *$/u, "not moving: a rate, but no time left");
  assert.match(idle ?? "", /30%. +-- +-- *$/u, "never started");
});

// Loading.

test("loading shows a spinner and mounts nothing of its children, holds Enter and typing from the page, and lets other keys go up", () => {
  heard.length = 0;
  const seen = viewer(h(Loader, {}));
  assert.match(drawn(seen, 1)[0] ?? "", /Loading/u);
  seen.press(1, Key.Enter);
  seen.typeText(1, "abc");
  assert.deepEqual(heard, [], "nothing of the children mounted, and Enter and typing held");
  seen.press(1, Key.Home);
  assert.match(drawn(seen, 1)[0] ?? "", /arrived/u);
  seen.press(1, Key.Enter);
  assert.deepEqual(heard, ["page Home", "mounted", "arrival Enter"], "loaded, the children are mounted and the keys are theirs");
});

test("loading told to show a skeleton shows its rows of separated blocks instead of the spinner", () => {
  heard.length = 0;
  const seen = viewer(h(Loader, { skeleton: true }));
  assert.deepEqual(
    [0, 1, 2].map((row) => codes(seen, row)[1]),
    [Attribute.Separated, Attribute.Separated, SPACE_CODE],
  );
  assert.ok(!shows(seen.seen(1, PAGE).rows, "Loading"));
});

test("a page whose control is still loading when its needs are found still gives each viewer a copy of their own", () => {
  const channel = new ComponentChannel(
    [{ page: PAGE, title: "Test", root: (): Element => frame("Test", h(Loading, { loading: true }, h(Switch, { label: "Sound" }))) }],
    { opus: fakeOpus() },
  );
  assert.equal(channel.perViewer(PAGE), true, "the switch's own copy was not missed");
});

// Skeletons.

test("a skeleton draws its rows as separated blocks of the widths given, used in turn, and stays still unless it shimmers", () => {
  const seen = viewer(h(Skeleton, { rows: 3, widths: [6, 2] }));
  assert.deepEqual(
    [0, 1, 2].map((row) => codes(seen, row).slice(0, line(row === 1 ? 2 : 6).length)),
    [line(6), line(2), line(6)],
  );
  const before = drawn(seen, 3);
  wait(seen, 1_000);
  assert.deepEqual(drawn(seen, 3), before);
});

test("a shimmering skeleton moves a brighter band across, its colour changing in cells that hold the block", () => {
  const seen = viewer(h(Skeleton, { rows: 1, widths: [20], shimmer: true }));
  /** Where the line's colour codes are, after its lead, and the lead's colour. */
  const changes = (): [number | undefined, number[]] => {
    const row = codes(seen, 0);
    const found = row
      .slice(SKELETON_LEAD, SKELETON_LEAD + 20)
      .flatMap((code, cell) => (code === mosaicColour(Colour.White) || code === mosaicColour(Colour.Blue) ? [cell] : []));
    return [row[0], found];
  };
  assert.deepEqual(changes(), [mosaicColour(Colour.Blue), []], "the band has not reached the line");
  wait(seen, STEP_MS);
  assert.deepEqual(changes(), [mosaicColour(Colour.White), [2]], "the band over the line's start, ending at its third cell");
  wait(seen, 2 * STEP_MS);
  assert.deepEqual(changes(), [mosaicColour(Colour.Blue), [2, 6]], "the band on the line, from its third cell to its seventh");
});
