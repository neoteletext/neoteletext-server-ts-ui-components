// Controls of the library's components a click and a hover reach:
// calendars, sliders, canvases, lists, and the hint row and rollover.

import assert from "node:assert/strict";
import { test } from "node:test";

import { text } from "neottx-server-ts-protocol/testing";
import {
  BAR_CELLS,
  Button,
  Calendar,
  type CalendarDate,
  ChoiceList,
  type ColourTable,
  DataTable,
  DATE_FORMATS,
  type Element,
  formatDate,
  Frame,
  h,
  type PageSpec,
  PaintCanvas,
  rolloverLine,
  Select,
  Slider,
  Text,
} from "../src/index.ts";
import { Colour, COLUMNS, Key } from "../src/kit.ts";
import { PAGE, PROMPTS, BODY_ROW, frame, latestTti, controlsOf, areasOf, inOrder, harness, viewer, week, HoverWatcher, button } from "./controls-fixtures.ts";

test("a calendar's controls are its arrows and the chosen week's days; a click on any day chooses it and the controls follow its week", () => {
  const chosen: CalendarDate[] = [];
  const page = viewer(
    h(Calendar, {
      year: 2026,
      month: 9,
      selectable: true,
      onChoose: (date: CalendarDate) => {
        chosen.push(date);
      },
    }),
  );
  // The heading, "← October 2026 →", centred in the seven days' 28 cells after its colour's cell; 1 October 2026 is a Thursday.
  const heading = `← ${formatDate(Date.UTC(2026, 9, 1), DATE_FORMATS.month)} →`;
  const at = Math.floor((28 - heading.length) / 2) + 1;
  const arrows = [
    { row: BODY_ROW, column: at, width: 2, height: 1 },
    { row: BODY_ROW, column: at + heading.length - 2, width: 2, height: 1 },
  ];
  assert.deepEqual(inOrder(controlsOf(page, PAGE)), [...arrows, ...week(BODY_ROW + 2, 3)]);
  // 15 October is the third week's Thursday.
  page.clickLeft(1, 4 * 3 + 2, BODY_ROW + 4);
  assert.deepEqual(chosen, [{ year: 2026, month: 9, day: 15 }]);
  assert.deepEqual(inOrder(controlsOf(page, PAGE)), [...arrows, ...week(BODY_ROW + 4, 0)]);
  page.clickLeft(1, at, BODY_ROW);
  assert.match(text(page.seen(1, PAGE).rows, BODY_ROW), /September 2026/u, "the left arrow turns back a month");
});

test("a slider's track is its control; a scroll bar that scrolls is one, the whole bar; disabled, neither, and the wheel turns nothing", () => {
  const items = Array.from({ length: 10 }, (_, index) => `item ${index + 1}`);
  const page = viewer(h(Slider, { label: "Volume", min: 0, max: 10 }), h(ChoiceList, { items, shown: 4, onChoose: () => {} }));
  const track = COLUMNS - 12 - 1 - 6;
  const rows = Array.from({ length: 4 }, (_, row) => ({ row: BODY_ROW + 1 + row, column: 1, width: COLUMNS - BAR_CELLS - 2, height: 1 }));
  assert.deepEqual(
    inOrder(controlsOf(page, PAGE)),
    inOrder([{ row: BODY_ROW, column: 13, width: track, height: 1 }, ...rows, { row: BODY_ROW + 1, column: COLUMNS - BAR_CELLS, width: BAR_CELLS, height: 4 }]),
  );
  const off = viewer(h(Slider, { label: "Volume", min: 0, max: 10, disabled: true }), h(ChoiceList, { items, shown: 4, disabled: true, onChoose: () => {} }));
  assert.deepEqual(controlsOf(off, PAGE), []);
  off.wheel(1, 120, 5, BODY_ROW + 1);
  off.clickLeft(1, 39, BODY_ROW + 4);
  assert.match(text(off.seen(1, PAGE).rows, BODY_ROW + 1), /item 1 /u);
});

test("a disabled select does not open to a click, and a disabled table does not sort", () => {
  const page = viewer(
    h(Select, { label: "Pick", items: ["one", "two"], disabled: true }),
    h(DataTable, { columns: [{ title: "Name", width: 10 }], rows: [["b"], ["a"]], shown: 2, sortable: true, disabled: true }),
  );
  assert.deepEqual(controlsOf(page, PAGE), []);
  page.clickLeft(1, 16, BODY_ROW);
  page.clickLeft(1, 4, BODY_ROW + 1);
  const rows = page.seen(1, PAGE).rows;
  assert.match(text(rows, BODY_ROW + 1), /Name/u, "the table's heading straight under the select: no list opened");
  assert.match(text(rows, BODY_ROW + 2), /b/u, "unsorted");
});

test("a paint canvas with a brush is a pointer area over its surface, its mark on the cell under the pointer; without, it declares none; disabled, it paints nothing", () => {
  const EMPTY_CELL = 0x20;
  const MARK = 0x2c;
  const page = viewer(h(PaintCanvas, { columns: 10, rows: 4, brush: true }));
  assert.deepEqual(areasOf(page, PAGE), { areas: [{ row: BODY_ROW, column: 1, width: 9, height: 4 }], wholePage: false });
  assert.deepEqual(controlsOf(page, PAGE), [], "the surface is no control");
  page.move(1, 0, 5, BODY_ROW + 1);
  assert.equal(page.seen(1, PAGE).rows[BODY_ROW + 1]?.[5], MARK, "the middle row of an empty cell");
  page.move(1, 0, 6, BODY_ROW + 1);
  assert.deepEqual([page.seen(1, PAGE).rows[BODY_ROW + 1]?.[5], page.seen(1, PAGE).rows[BODY_ROW + 1]?.[6]], [EMPTY_CELL, MARK]);
  const plain = viewer(h(PaintCanvas, { columns: 10, rows: 4 }));
  assert.deepEqual(areasOf(plain, PAGE), { areas: [], wholePage: false });
  const off = viewer(h(PaintCanvas, { columns: 10, rows: 4, disabled: true }));
  off.clickLeft(1, 5, BODY_ROW + 1);
  assert.equal(off.seen(1, PAGE).rows[BODY_ROW + 1]?.[5], EMPTY_CELL);
});

test("a list's row is pressed only on its band: a click under a select's label, on the row's indent, takes nothing", () => {
  const changes: number[] = [];
  const page = viewer(
    h(Select, {
      label: "Pick",
      items: ["one", "two", "three"],
      onChange: (value: number) => {
        changes.push(value);
      },
    }),
  );
  page.press(1, Key.Enter);
  const below = controlsOf(page, PAGE).find((control) => control.row > BODY_ROW);
  assert.deepEqual(
    below,
    { row: BODY_ROW + 1, column: 13, width: COLUMNS - 13, height: 1 },
    "after the label's 12 cells, from New Background to the row's end",
  );
  page.clickLeft(1, 3, BODY_ROW + 2);
  assert.deepEqual(changes, []);
  page.clickLeft(1, 15, BODY_ROW + 2);
  assert.deepEqual(changes, [1]);
});

test("a hover goes to the component whose control begins at its cell, and up; the hint row says what the hovered control does while the pointer is on it", () => {
  const seen: string[] = [];
  const page = viewer(
    h(
      HoverWatcher,
      { seen },
      h(Button, { label: "one", hint: "one is pressed", onPress: () => {} }),
      h(Button, { label: "two", hint: "two is pressed", onPress: () => {} }),
    ),
  );
  const [one, two, ...more] = inOrder(controlsOf(page, PAGE));
  assert.ok(one !== undefined && two !== undefined && more.length === 0, "two controls");
  assert.match(text(page.seen(1, PAGE).rows, 23), /one is pressed/u, "the first button has the keys");
  page.hover(1, "enter", two.column, two.row);
  assert.match(text(page.seen(1, PAGE).rows, 23), /two is pressed/u, "the hovered button says what it does");
  // Moving from one control to the next is a leave, then an enter (INPUT.md section 5.4).
  page.hover(1, "leave", two.column, two.row);
  page.hover(1, "enter", one.column, one.row);
  page.hover(1, "leave", one.column, one.row);
  assert.match(text(page.seen(1, PAGE).rows, 23), /one is pressed/u, "off every control, the focused one's hint again");
  assert.deepEqual(seen, [
    `enter ${two.row},${two.column}`,
    `leave ${two.row},${two.column}`,
    `enter ${one.row},${one.column}`,
    `leave ${one.row},${one.column}`,
  ]);
});

test("a hover where no control begins is dropped, as is a leave with no enter; an enter with a leave missed leaves the control before first", () => {
  const seen: string[] = [];
  const page = viewer(h(HoverWatcher, { seen }, h(Button, { label: "one", onPress: () => {} }), h(Button, { label: "two", onPress: () => {} })));
  const [one, two] = inOrder(controlsOf(page, PAGE));
  assert.ok(one !== undefined && two !== undefined);
  page.hover(1, "enter", one.column + 1, one.row);
  page.hover(1, "leave", one.column, one.row);
  assert.deepEqual(seen, [], "inside a control is not its first cell, and nothing was entered to leave");
  page.hover(1, "enter", one.column, one.row);
  page.hover(1, "enter", one.column, one.row);
  page.hover(1, "enter", two.column, two.row);
  assert.deepEqual(
    seen,
    [`enter ${one.row},${one.column}`, `leave ${one.row},${one.column}`, `enter ${two.row},${two.column}`],
    "an enter again says nothing new",
  );
});

const lines = (spec: Partial<PageSpec>): string[] => {
  const seen = harness([{ page: PAGE, title: "Test", perViewer: true, root: button, ...spec }]);
  seen.join(1, PAGE);
  return latestTti(seen, PAGE)
    .split("\n")
    .filter((line) => line.startsWith("OL,28,"));
};

test("a page with controls sends the rollover packet with its first sub-page; one without, or whose spec says null, does not", () => {
  assert.deepEqual(lines({}), [rolloverLine()]);
  const own: ColourTable = [0x111, 0x222, 0x333, 0x444, 0x555, 0x666, 0x777, 0x888];
  assert.deepEqual(lines({ rollover: own }), [rolloverLine(own)]);
  assert.deepEqual(lines({ rollover: null }), []);
  assert.deepEqual(lines({ root: (): Element => frame("Test", h(Text, { text: "nothing to press" })) }), []);
});

test("on a page whose frame says what its keys do, the hint row says what the hovered control does while the pointer is on it", () => {
  const page = harness([
    {
      page: PAGE,
      title: "Test",
      perViewer: true,
      root: (): Element =>
        h(
          Frame,
          { title: "Test", background: Colour.Blue, prompts: PROMPTS, hint: "the page's own words" },
          h(Button, { label: "one", hint: "one is pressed", onPress: () => {} }),
        ),
    },
  ]);
  page.join(1, PAGE);
  const [one] = controlsOf(page, PAGE);
  assert.ok(one !== undefined);
  assert.match(text(page.seen(1, PAGE).rows, 23), /the page's own words/u);
  page.hover(1, "enter", one.column, one.row);
  assert.match(text(page.seen(1, PAGE).rows, 23), /one is pressed/u);
  page.hover(1, "leave", one.column, one.row);
  assert.match(text(page.seen(1, PAGE).rows, 23), /the page's own words/u);
});
