// The scrolling view (REQ-2153): any components, each a unit of the rows
// its `height` says, scrolled by the keys, the wheel and the bar a unit at a
// time, never cut at its edge; only the units in view drawn, so only they
// declare anything on the page; and each viewer's place their own.

import assert from "node:assert/strict";
import { test } from "node:test";

import { text } from "neoteletext-server-ts-protocol/testing";
import { Action, type Canvas, Component, DoubleHeight, h, Rows, ScrollView } from "../src/index.ts";
import { COLUMNS, Key } from "../src/kit.ts";
import { BAR_CELLS } from "../src/lists/scroll.ts";
import { BODY_ROW, controls, NOTCH, PAGE, row, viewer } from "./mouse-fixtures.ts";

/** A cell of the view's text, away from its bar. */
const TEXT_COLUMN = 5;
/** A cell of the view's bar. */
const BAR_COLUMN = COLUMNS - 1;

/** The first printable code: those below it are spacing attributes, which a row's text shows as they are. */
const SPACE = 0x20;

/** A row's text as it reads: its attributes as spaces, trimmed. */
function reads(line: string): string {
  return Array.from({ length: line.length }, (_, at) => ((line.codePointAt(at) ?? SPACE) < SPACE ? " " : line.charAt(at)))
    .join("")
    .trim();
}

/** The view's rows as text, from its first. */
function shownRows(page: ReturnType<typeof viewer>, shown: number): string[] {
  return Array.from({ length: shown }, (_, at) => reads(row(page, BODY_ROW + at).slice(0, COLUMNS - BAR_CELLS)));
}

/** Headings two rows high between lines of one: rows 2, 1, 1, 2, 1, 2, 1. */
function headingsAndLines(): ReturnType<typeof h>[] {
  return [
    h(DoubleHeight, { text: "Alpha", height: 2 }),
    h(Rows, {}, "one"),
    h(Rows, {}, "two"),
    h(DoubleHeight, { text: "Beta", height: 2 }),
    h(Rows, {}, "three"),
    h(DoubleHeight, { text: "Gamma", height: 2 }),
    h(Rows, {}, "four"),
  ];
}

test("the keys move the view a unit, a screen less one unit, and to the ends, and a unit of two rows is never cut at its edge (REQ-2153)", () => {
  const page = viewer(h(ScrollView, { shown: 4 }, ...headingsAndLines()));
  const seen = (): string[] => shownRows(page, 4).map((each) => each.replaceAll(/\s+/gu, " "));
  // A double-height line's second row repeats nothing of its own: the row under it is the heading's.
  assert.match(seen()[0] ?? "", /Alpha/u);
  assert.deepEqual(seen().slice(2), ["one", "two"]);
  page.press(1, Key.Down);
  assert.deepEqual(seen().slice(0, 2), ["one", "two"]);
  assert.match(seen()[2] ?? "", /Beta/u);
  page.press(1, Key.Down);
  page.press(1, Key.Down);
  // Beta's two rows and three's one fit; Gamma's two would pass the edge, so the view's last row is empty rather than half of Gamma.
  assert.match(seen()[0] ?? "", /Beta/u);
  assert.deepEqual(seen().slice(2), ["three", ""]);
  page.press(1, Key.End);
  assert.equal(seen()[0], "three");
  assert.match(seen()[1] ?? "", /Gamma/u);
  assert.equal(seen()[3], "four");
  page.press(1, Key.Down);
  assert.equal(seen()[0], "three", "End is as far as the view goes");
  page.press(1, Key.Home);
  page.press(1, Key.PageDown);
  // Three units showed from Alpha; a screen less one unit is two units on, to "two".
  assert.equal(seen()[0], "two");
  page.press(1, Key.Up);
  assert.equal(seen()[0], "one");
});

test("the wheel over the view's text or its bar scrolls it a unit a notch, through the page's reach (REQ-2153)", () => {
  const lines = Array.from({ length: 20 }, (_, index) => `line ${index + 1}`);
  const page = viewer(h(ScrollView, { shown: 5 }, ...lines));
  page.wheel(1, 2 * NOTCH, TEXT_COLUMN, BODY_ROW + 1);
  assert.equal(shownRows(page, 1)[0], "line 3");
  page.wheel(1, NOTCH, BAR_COLUMN, BODY_ROW + 4);
  assert.equal(shownRows(page, 1)[0], "line 4");
  page.wheel(1, -NOTCH, TEXT_COLUMN, BODY_ROW);
  assert.equal(shownRows(page, 1)[0], "line 3");
});

test("a press below the bar's block steps a unit taller than the view asked, and the block dragged to the bottom reaches the last unit (REQ-2153)", () => {
  // Four units of three rows in a view of four: each shows alone, and the last starts at row 9 of 12, past the bar's end of 12 - 4.
  const units = ["u1", "u2", "u3", "u4"].map((name) => h(Rows, { height: 3 }, `${name} a`, `${name} b`, `${name} c`));
  const page = viewer(h(ScrollView, { shown: 4 }, ...units));
  assert.deepEqual(shownRows(page, 4), ["u1 a", "u1 b", "u1 c", ""]);
  page.clickLeft(1, BAR_COLUMN, BODY_ROW + 3);
  assert.deepEqual(shownRows(page, 4), ["u2 a", "u2 b", "u2 c", ""]);
  // The block, one cell of a track of four, now stands at its second cell: grip it there and drag it to the last.
  page.mouse(1, "press", 0, BAR_COLUMN, BODY_ROW + 1);
  page.move(1, 1, BAR_COLUMN, BODY_ROW + 3);
  page.mouse(1, "release", 0, BAR_COLUMN, BODY_ROW + 3);
  assert.deepEqual(shownRows(page, 4), ["u4 a", "u4 b", "u4 c", ""]);
});

test("only the units in view declare their controls, each at the row where it now stands (REQ-2153)", () => {
  const pressed: string[] = [];
  const actions = Array.from({ length: 8 }, (_, index) =>
    h(Action, {
      text: `Go ${index + 1}`,
      onPress: () => {
        pressed.push(`Go ${index + 1}`);
      },
    }),
  );
  const page = viewer(h(ScrollView, { shown: 3 }, ...actions));
  const declared = (): { row: number; text: string }[] =>
    controls(page)
      .filter((control) => control.column < COLUMNS - BAR_CELLS)
      .map((control) => ({ row: control.row, text: row(page, control.row).slice(control.column, control.column + control.width) }));
  assert.deepEqual(declared(), [
    { row: BODY_ROW, text: "Go 1" },
    { row: BODY_ROW + 1, text: "Go 2" },
    { row: BODY_ROW + 2, text: "Go 3" },
  ]);
  page.press(1, Key.End);
  assert.deepEqual(declared(), [
    { row: BODY_ROW, text: "Go 6" },
    { row: BODY_ROW + 1, text: "Go 7" },
    { row: BODY_ROW + 2, text: "Go 8" },
  ]);
  page.clickLeft(1, 1, BODY_ROW + 1);
  assert.deepEqual(pressed, ["Go 7"], "a click on a row reaches the unit standing there now");
});

/** A unit that notes each time it is painted. */
class Noted extends Component<{ readonly name: string; readonly painted: string[] }> {
  override measure(space: { readonly width: number }): { width: number; height: number } {
    return { width: space.width, height: 1 };
  }

  override paint(canvas: Canvas): void {
    this.props.painted.push(this.props.name);
    canvas.text(0, 0, this.props.name);
  }
}

test("units out of view are not painted at all (REQ-2153)", () => {
  const painted: string[] = [];
  const names = Array.from({ length: 10 }, (_, index) => `unit ${index}`);
  const page = viewer(h(ScrollView, { shown: 3 }, ...names.map((name) => h(Noted, { name, painted }))));
  assert.deepEqual(new Set(painted), new Set(["unit 0", "unit 1", "unit 2"]));
  painted.length = 0;
  page.press(1, Key.End);
  assert.deepEqual(new Set(painted), new Set(["unit 7", "unit 8", "unit 9"]));
});

test("a unit taller than the view shows alone from its first row, and the next key moves past it (REQ-2153)", () => {
  const tall = h(Rows, { height: 6 }, "t1", "t2", "t3", "t4", "t5", "t6");
  const page = viewer(h(ScrollView, { shown: 4 }, h(Rows, {}, "before"), tall, h(Rows, {}, "after")));
  page.press(1, Key.Down);
  assert.deepEqual(shownRows(page, 4), ["t1", "t2", "t3", "t4"]);
  page.press(1, Key.Down);
  assert.deepEqual(shownRows(page, 4), ["after", "", "", ""]);
});

test("each viewer scrolls the view on their own copy of the page (REQ-2153)", () => {
  const lines = Array.from({ length: 10 }, (_, index) => `line ${index + 1}`);
  const page = viewer(h(ScrollView, { shown: 3 }, ...lines));
  page.join(2, PAGE);
  page.press(1, Key.End);
  assert.equal(shownRows(page, 1)[0], "line 8");
  assert.equal(reads(text(page.seen(2, PAGE).rows, BODY_ROW).slice(0, COLUMNS - BAR_CELLS)), "line 1");
});
