// What the charts, gauges, clocks, calendars and toasts do with numbers and
// dates that a program or the outside gives them and that do not fit: NaN,
// Infinity, a width below nought, a series too long to spread into a call,
// a date that is null. Each draws something bounded and the page is
// published, where before it threw, hung, or kept more than it showed.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Harness, rowOf, text } from "neoteletext-server-ts-protocol/testing";
import {
  Action,
  Bar,
  BarChart,
  Calendar,
  type CalendarDate,
  type Child,
  clockTime,
  ColumnChart,
  Component,
  ComponentChannel,
  Countdown,
  type DateValue,
  type Element,
  formatDate,
  Frame,
  h,
  LineChart,
  LineGauge,
  ProgressBar,
  ToastShelf,
  type ToastShelfProps,
  UPPER_TWO,
} from "../src/index.ts";
import { Colour, Key } from "../src/kit.ts";

const PAGE = 0x150;
const PROMPTS = [
  ["Index", 0x100],
  ["", null],
  ["", null],
  ["", null],
] as const;
/** The frame's first body row. */
const BODY_ROW = 3;
/** Past the largest array length, 2^32 - 1: an array sized by it throws a RangeError. */
const PAST_ARRAY_LENGTH = -(2 ** 32);
/** More values than a call takes as arguments: Math.max(...values) throws a RangeError. */
const PAST_SPREAD = 300_000;

/** One viewer's page of `body`, joined. */
function viewer(...body: Child[]): Harness {
  const seen = new Harness([
    new ComponentChannel([
      { page: PAGE, title: "Test", perViewer: true, root: (): Element => h(Frame, { title: "Test", background: Colour.Blue, prompts: PROMPTS }, ...body) },
    ]),
  ]);
  seen.join(1, PAGE);
  return seen;
}

/** The body's rows as the viewer sees them, after asserting the channel reported no failure. */
function drawn(seen: Harness, rows: number): string[] {
  assert.deepEqual(seen.errors, [], "the channel reported no failure");
  return Array.from({ length: rows }, (_, row) => text(seen.seen(1, PAGE).rows, BODY_ROW + row));
}

/** A bar's whole cells, its upper two rows of sixels. */
const BAR_CELL = String.fromCodePoint(UPPER_TWO);

/** The whole cells of bar in a row. */
function blocks(row: string): number {
  return row.split(BAR_CELL).length - 1;
}

/** Clicks the first cell of `words` where the viewer sees them. */
function clickOn(seen: Harness, words: string): void {
  const rows = seen.seen(1, PAGE).rows;
  const row = rowOf(rows, words);
  assert.ok(row !== undefined, `"${words}" is shown`);
  seen.clickLeft(1, text(rows, row).indexOf(words), row);
}

test("a line chart with a value that is not a number draws the rest, where its line never met its end", () => {
  const rows = drawn(viewer(h(LineChart, { values: [1, Number.NaN, 3], plotRows: 3 })), 3);
  assert.match(rows[0] ?? "", /3/u, "the most on the axis is the most of the numbers");
  assert.match(rows[2] ?? "", /1/u, "and the least");
});

test("a line chart whose span is past the largest number draws its axes, where its line never met its end", () => {
  const rows = drawn(viewer(h(LineChart, { values: [Number.MAX_VALUE, -Number.MAX_VALUE, 0], plotRows: 3 })), 3);
  assert.equal(rows.length, 3);
});

test("a line chart of more values than a call takes as arguments is drawn", () => {
  const values = Array.from({ length: PAST_SPREAD }, (_, index) => index % 10);
  const rows = drawn(viewer(h(LineChart, { values, plotRows: 3 })), 3);
  assert.match(rows[0] ?? "", /9/u, "the most on the axis");
});

test("a bar of NaN is no bar, and the page is published", () => {
  const rows = drawn(viewer(h(Bar, { value: Number.NaN, max: 10 })), 1);
  assert.equal(blocks(rows[0] ?? ""), 0, "no bar");
});

test("a bar chart with NaN and Infinity among its figures draws the others to the most of the numbers", () => {
  const bars = [
    { label: "nan", value: Number.NaN },
    { label: "inf", value: Number.POSITIVE_INFINITY },
    { label: "ten", value: 10 },
    { label: "five", value: 5 },
  ];
  const rows = drawn(viewer(h(BarChart, { bars })), 4);
  assert.equal(blocks(rows[0] ?? ""), 0, "NaN is no bar");
  assert.equal(blocks(rows[1] ?? ""), blocks(rows[2] ?? ""), "Infinity is a whole bar, as the most is");
  assert.ok(blocks(rows[3] ?? "") < blocks(rows[2] ?? ""), "five is shorter than ten");
});

test("a bar chart whose labels are given less than no cells is drawn", () => {
  drawn(viewer(h(BarChart, { bars: [{ label: "a", value: 1 }], labelCells: PAST_ARRAY_LENGTH })), 1);
});

test("a column chart whose columns are given less than no cells, or NaN, is drawn", () => {
  const bars = [{ label: "a", value: 1 }];
  drawn(viewer(h(ColumnChart, { bars, plotRows: 2, columnCells: -1 })), 3);
  drawn(viewer(h(ColumnChart, { bars, plotRows: 2, columnCells: Number.NaN })), 3);
});

test("a column chart of more rows than the page has draws only the rows the page has, and promptly", () => {
  const started = performance.now();
  drawn(viewer(h(ColumnChart, { bars: [{ label: "a", value: 1 }], plotRows: 1e9 })), 1);
  assert.ok(performance.now() - started < 1_000, "drawn in under a second");
});

test("a progress bar whose label is given less than no cells is drawn", () => {
  drawn(viewer(h(ProgressBar, { label: "a", value: 1, max: 2, labelCells: PAST_ARRAY_LENGTH })), 1);
});

test("a line gauge whose label is given less than no cells is drawn", () => {
  drawn(viewer(h(LineGauge, { label: "a", value: 1, max: 2, labelCells: PAST_ARRAY_LENGTH })), 1);
});

test("a line gauge of NaN, or of Infinity of Infinity, is empty", () => {
  // Hold Mosaics, the filled part's colour, and at once the rest's: no cell filled.
  // oxlint-disable-next-line eslint/no-control-regex -- a teletext row holds its attribute codes; the test reads them
  const empty = /^\u001E\u0016\u0014/u;
  assert.match(drawn(viewer(h(LineGauge, { value: Number.NaN, max: 10 })), 1)[0] ?? "", empty);
  assert.match(drawn(viewer(h(LineGauge, { value: Number.POSITIVE_INFINITY, max: Number.POSITIVE_INFINITY })), 1)[0] ?? "", empty);
});

test("a stream's time that is not a number is written as nought", () => {
  assert.equal(clockTime(Number.NaN), "0:00");
  assert.equal(clockTime(Number.POSITIVE_INFINITY), "0:00");
  assert.equal(clockTime(3_723), "1:02:03", "a number as it was");
});

test("a countdown to a time that is not a number shows nought, as one whose time has come does", () => {
  const nan = drawn(viewer(h(Countdown, { until: Number.NaN })), 3);
  const past = drawn(viewer(h(Countdown, { until: 0 })), 3);
  assert.deepEqual(nan, past);
});

test("a date read from outside that is null is not a date: the fallback shows", () => {
  // oxlint-disable-next-line typescript/no-unsafe-assignment -- a program that takes its feed's dates on trust, as this test plays one
  const story: { readonly date: DateValue } = JSON.parse('{ "date": null }');
  assert.equal(formatDate(story.date, "DD MMM YYYY", "undated"), "undated");
});

test("a calendar turned back from January of year nought shows December, a month there is", () => {
  const chosen: CalendarDate[] = [];
  const seen = viewer(
    h(Calendar, {
      year: 0,
      month: 0,
      selectable: true,
      onChoose: (date: CalendarDate) => {
        chosen.push(date);
      },
    }),
  );
  seen.press(1, Key.PageUp);
  seen.press(1, Key.Enter);
  assert.deepEqual(chosen, [{ year: -1, month: 11, day: 1 }]);
});

/** Timers a shelf has set and not yet seen run or cleared. */
const liveTimers = new Set<number>();
let lastShelf: CountingShelf | null = null;

/** A toast shelf that counts its live timers, and that a test can reach. */
class CountingShelf extends ToastShelf {
  constructor(props: ToastShelfProps) {
    super(props);
    // oxlint-disable-next-line typescript/no-this-alias, unicorn/no-this-assignment -- the test reaches the shelf the mount made
    lastShelf = this;
  }

  protected override setTimeout(run: () => void, delay: number): number {
    const id = super.setTimeout(() => {
      liveTimers.delete(id);
      run();
    }, delay);
    liveTimers.add(id);
    return id;
  }

  protected override clearTimer(id: number): void {
    liveTimers.delete(id);
    super.clearTimer(id);
  }
}

/** An action that raises `count` toasts for its viewer at once. */
class RaiseToasts extends Component<{ readonly count: number }> {
  override render(): Child {
    return h(Action, {
      text: "raise",
      onPress: (session: number) => {
        for (let index = 0; index < this.props.count; index += 1) {
          this.services.bus.emit("toast", { kind: "info", text: `toast ${index}` }, { session });
        }
      },
    });
  }
}

test("a burst of toasts leaves no more toasts or timers than the shelf shows", () => {
  liveTimers.clear();
  const seen = viewer(h(CountingShelf, { maxShown: 3 }), h(RaiseToasts, { count: 10 }));
  clickOn(seen, "raise");
  assert.equal(lastShelf?.state.shown.length, 3);
  assert.equal(liveTimers.size, 3, "the timers of the toasts it let go are cleared");
});

test("a shelf told to show no toasts, or NaN of them, keeps none or its usual three", () => {
  liveTimers.clear();
  const none = viewer(h(CountingShelf, { maxShown: 0 }), h(RaiseToasts, { count: 10 }));
  clickOn(none, "raise");
  assert.equal(lastShelf?.state.shown.length, 0);
  assert.equal(liveTimers.size, 0);
  const nan = viewer(h(CountingShelf, { maxShown: Number.NaN }), h(RaiseToasts, { count: 10 }));
  clickOn(nan, "raise");
  assert.equal(lastShelf?.state.shown.length, 3);
});
