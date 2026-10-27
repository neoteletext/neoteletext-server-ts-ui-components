// What the gauges, wheels, tables, trees, sliders, dialogs, selects and
// timers do with what a program gives them that is out of range: a step of
// nought, a choice past the end, a period of nothing, a ring of a billion
// segments, a tree that holds itself. Each is drawn bounded, in the colours
// and cells it says it has, where before it cut a cell off, drew the wrong
// colour, answered with a button that is not there, or ran without end.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Harness, rowOf, text } from "neottx-server-ts-protocol/testing";
import {
  Action,
  type Child,
  ComponentChannel,
  DataTable,
  Dialog,
  type Element,
  Frame,
  h,
  LineGauge,
  Select,
  Slider,
  Spinner,
  Ticker,
  Tree,
  type TreeNode,
  Wheel,
  Wizard,
} from "../src/index.ts";
import { LEAST_FRAME_MS } from "../src/core/timers.ts";
import { Colour, Key } from "../src/kit.ts";
import { controls } from "./mouse-fixtures.ts";

const PAGE = 0x150;
const PROMPTS = [["Index", 0x100]] as const;
/** The frame's first body row. */
const BODY_ROW = 3;
/** Long enough that a loop of it, drawn or walked, does not end within a test run: without its bound the test does not end. */
const PAST_DRAWING = 1_000_000_000;

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

/** Every row of the viewer's page, as text, after asserting the channel reported no failure. */
function page(seen: Harness): string[] {
  assert.deepEqual(seen.errors, [], "the channel reported no failure");
  const rows = seen.seen(1, PAGE).rows;
  return rows.map((_, row) => text(rows, row));
}

test("a line gauge across a whole row ends with its percentage, the % sign included", () => {
  const rows = page(viewer(h(LineGauge, { value: 1, max: 2 })));
  assert.match(rows[BODY_ROW] ?? "", /50%$/u);
});

test("a wheel of more segments than its ring has cells draws its ring", () => {
  const rows = page(viewer(h(Wheel, { lit: 0, segments: PAST_DRAWING })));
  assert.match(rows.join("\n"), /\u007F/u, "the ring's blocks");
});

test("a wheel of no segments, or of a number that is none, draws nothing and the page is published", () => {
  for (const segments of [0, -3, Number.NaN]) {
    const rows = page(viewer(h(Wheel, { lit: 0, segments })));
    assert.doesNotMatch(rows.slice(BODY_ROW).join("\n"), /\u007F/u, `${segments} segments: no blocks`);
  }
});

/** Rows that count how often they are sorted. */
class CountedRows extends Array<readonly string[]> {
  sorts = 0;

  override toSorted(compare?: (a: readonly string[], b: readonly string[]) => number): (readonly string[])[] {
    this.sorts += 1;
    return super.toSorted(compare);
  }
}

test("a sorted table sorts its rows when they or its order change, not again for the pointer moving over them", () => {
  const rows = new CountedRows();
  rows.push(["b"], ["a"], ["c"]);
  const seen = viewer(h(DataTable, { columns: [{ title: "Name", width: 10 }], rows, shown: 3, selectable: true, sortable: true, onHover: () => {} }));
  seen.press(1, "1");
  const sorted = rows.sorts;
  assert.ok(sorted > 0, "sorting by the first column sorts");
  // The rows' first letters come after their colour cells.
  assert.match(page(seen)[BODY_ROW + 1] ?? "", /^[^a-z]*a\s/u, "the rows are shown sorted, under the heading");
  const rowControls = controls(seen).filter((control) => control.row > BODY_ROW);
  assert.equal(rowControls.length, 3, "each row is a control");
  for (const control of [...rowControls, ...rowControls]) {
    seen.hover(1, "enter", control.column, control.row);
  }
  assert.equal(rows.sorts, sorted, "hovering sorts nothing");
});

test("a tree that holds itself is listed to a bound, opened at every level", () => {
  const loop: { label: string; children: TreeNode[] } = { label: "loop", children: [] };
  loop.children.push(loop, loop);
  const rows = page(viewer(h(Tree, { nodes: [loop], shown: 5, open: ["loop"] })));
  assert.match(rows[BODY_ROW] ?? "", /- loop/u, "the first item, open");
});

test("a slider with a step of nought steps by one", () => {
  const values: number[] = [];
  const seen = viewer(
    h(Slider, {
      label: "Volume",
      min: 0,
      max: 10,
      step: 0,
      initial: 5,
      onChange: (value: number) => {
        values.push(value);
      },
    }),
  );
  seen.press(1, Key.Right);
  assert.deepEqual(values, [6]);
  assert.doesNotMatch(page(seen).join("\n"), /NaN/u);
});

test("a dialog's first choice past its buttons is its last button", () => {
  const answers: (number | null)[] = [];
  const seen = viewer(
    h(Dialog, {
      title: "Sure?",
      buttons: ["Yes", "No"],
      initial: 7,
      onAnswer: (button: number | null) => {
        answers.push(button);
      },
    }),
  );
  seen.press(1, Key.Enter);
  assert.deepEqual(answers, [1]);
});

test("a select's first item past its items, or one that is no number, is an item it has", () => {
  for (const [initial, shown] of [
    [9, "Blue"],
    [-2, "Red"],
    [Number.NaN, "Red"],
  ] as const) {
    const rows = page(viewer(h(Select, { label: "Colour", items: ["Red", "Green", "Blue"], initial })));
    assert.ok(
      rows.some((row) => row.includes(shown)),
      `${initial} shows ${shown}`,
    );
  }
});

/** The milliseconds in a second. */
const SECOND_MS = 1000;

/** The page's publications during one second, the clock moved a millisecond at a time, as a channel's wakes may come. */
function publishedInASecond(seen: Harness): number {
  const before = seen.publications().length;
  for (let elapsed = 0; elapsed < SECOND_MS; elapsed += 1) {
    seen.advance(1);
  }
  return seen.publications().length - before;
}

test("a ticker or spinner told to change every millisecond or less changes no faster than a picture can show", () => {
  const most = Math.ceil(SECOND_MS / LEAST_FRAME_MS) + 1;
  for (const everyMs of [0, 0.1, -5, Number.NaN]) {
    assert.ok(publishedInASecond(viewer(h(Ticker, { items: ["one", "two"], everyMs }))) <= most, `a ticker every ${everyMs} ms`);
    assert.ok(publishedInASecond(viewer(h(Spinner, { label: "Busy", everyMs }))) <= most, `a spinner every ${everyMs} ms`);
  }
});

test("a wizard's Back is drawn red, the key it is", () => {
  const seen = viewer(h(Wizard, { steps: ["One", "Two"] }, h(Action, { text: "first", onPress: () => {} }), h(Action, { text: "second", onPress: () => {} })));
  seen.press(1, Key.F2);
  const rows = seen.seen(1, PAGE).rows;
  const row = rowOf(rows, "red Back");
  assert.ok(row !== undefined, "Back is shown on the second step");
  const codes = rows[row] ?? [];
  const at = text(rows, row).indexOf("red Back");
  assert.equal(
    codes.slice(0, at).findLast((code) => code < 0x08),
    Colour.Red,
    "the last colour before it is red",
  );
});
