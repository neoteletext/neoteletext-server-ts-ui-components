// REQ-6539, page-rules.md RULE-54: the library writes each page's rule
// table from the components on it, so the page asks the viewer's receiver
// for exactly the input they take; and an input a rule of that table sends
// reaches its component as it did when every input was sent.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Action, BarChart, Button, h, type LogEntry, LogView, PaintCanvas, Slider, TextField } from "../src/index.ts";
import { COLUMNS, type RuleCondition } from "../src/kit.ts";
import { BODY_ROW, controlBy, controls, HINT_ROW, NOTCH, row, viewer } from "./mouse-fixtures.ts";
import { cellsRect, DRAG, REPORT, HOVER, KEYS, press, release, rowsRect, SELECTION, table, tableSent, TEXT, wheel } from "./page-rules-fixtures.ts";

/** No modifier key held, as an input event of the wire says it. */
const NO_MODS = 0;

test("RULE-54: a text field asks for every key with its repeats, the releases and text, and a press on its own cells, which gives it the keys", () => {
  const page = viewer(h(TextField, { label: "Name", longest: 10 }));
  assert.deepEqual(tableSent(page), table([...KEYS, TEXT, ...HOVER, press("textfield_1")], [rowsRect("textfield_1", BODY_ROW)]));
  page.fire(1, "keys", { kind: "key", action: "press", key: "a", mods: NO_MODS, text: "a" });
  page.fire(1, "keys_up", { kind: "key", action: "release", key: "a", mods: NO_MODS });
  page.fire(1, "text", { kind: "text", text: "bc" });
  assert.match(row(page, BODY_ROW), /abc/u, "a key and a text its rules sent are typed into it");
});

test("RULE-54: a button asks for the keys and a press on its cells, and for no release, move, wheel or text", () => {
  const pressed: number[] = [];
  const page = viewer(
    h(Button, {
      label: "Go",
      onPress: (connection: number) => {
        pressed.push(connection);
      },
    }),
  );
  assert.deepEqual(tableSent(page), table([...KEYS, ...HOVER, press("button_1")], [rowsRect("button_1", BODY_ROW)]));
  const button = controlBy(page, "Go");
  page.fire(1, "press_button_1", { kind: "mouse", action: "press", button: 0, column: button.column, row: button.row, mods: NO_MODS }, 7, { rect: "button_1" });
  assert.deepEqual(pressed, [1], "the press its rule sent presses it");
});

test("RULE-105: an input that names the row that fired reaches its component as one that names none: the library routes by where it landed, not by the rule or the row", () => {
  const pressed: number[] = [];
  const page = viewer(
    h(Button, {
      label: "Go",
      onPress: (connection: number) => {
        pressed.push(connection);
      },
    }),
  );
  const button = controlBy(page, "Go");
  const click = { kind: "mouse", action: "press", button: 0, column: button.column, row: button.row, mods: NO_MODS } as const;
  page.fire(1, "press_button_1", click, 1, { rect: "button_1" }, 0);
  page.fire(1, "keys", { kind: "key", action: "press", key: "Enter", mods: NO_MODS }, 2, undefined, 1);
  assert.deepEqual(pressed, [1, 1], "the press, and Enter on the button that has the keys, each with a row");
});

test("RULE-54: an action, which never takes the keys, asks for a press on its cells alone, and the pointer on its control for the hint row", () => {
  const pressed: number[] = [];
  const page = viewer(
    h(Action, {
      text: "Do it",
      onPress: (connection: number) => {
        pressed.push(connection);
      },
    }),
  );
  assert.deepEqual(tableSent(page), table([...SELECTION, ...HOVER, press("action_1")], [rowsRect("action_1", BODY_ROW)]));
  const action = controlBy(page, "Do it");
  page.fire(1, "press_action_1", { kind: "mouse", action: "press", button: 0, column: action.column, row: action.row, mods: NO_MODS }, 3, { rect: "action_1" });
  assert.deepEqual(pressed, [1]);
});

test("RULE-54: a slider, which is dragged, asks for the press, the release and the wheel on its cells and for the moves while a button is held", () => {
  const values: number[] = [];
  const page = viewer(
    h(Slider, {
      label: "Volume",
      min: 0,
      max: 10,
      initial: 5,
      onChange: (value: number) => {
        values.push(value);
      },
    }),
  );
  assert.deepEqual(
    tableSent(page),
    table([...KEYS, ...HOVER, press("slider_1"), release("slider_1"), wheel("slider_1"), DRAG], [rowsRect("slider_1", BODY_ROW)]),
  );
  page.fire(1, "wheel_slider_1", { kind: "wheel", dx: 0, dy: -NOTCH, column: 20, row: BODY_ROW, mods: NO_MODS }, 1, { rect: "slider_1" });
  assert.deepEqual(values, [6], "the wheel its rule sent steps it");
  const [track] = controls(page);
  assert.ok(track !== undefined, "the slider's track is its control");
  page.fire(1, "press_slider_1", { kind: "mouse", action: "press", button: 0, column: track.column, row: BODY_ROW, mods: NO_MODS }, 2, { rect: "slider_1" });
  // The drag leaves the slider's row: its moves come by the page's rule, and still reach the slider that took the press.
  page.fire(
    1,
    "drag",
    {
      kind: "mouse",
      action: "move",
      buttons: { left: true, middle: false, right: false },
      column: track.column + track.width - 1,
      row: BODY_ROW + 5,
      mods: NO_MODS,
    },
    3,
  );
  page.fire(
    1,
    "release_slider_1",
    { kind: "mouse", action: "release", button: 0, column: track.column + track.width - 1, row: BODY_ROW + 5, mods: NO_MODS },
    4,
    {
      rect: "slider_1",
    },
  );
  assert.equal(values.at(-1), 10, "dragged to its far end");
});

test("RULE-54: a list that scrolls asks for the wheel on its own rectangle and nowhere else", () => {
  const entries: LogEntry[] = Array.from({ length: 12 }, (_, index) => ({ at: Date.UTC(2026, 9, 28, 3, 0, index), level: "info", text: `entry ${index}` }));
  const page = viewer(h(LogView, { entries, shown: 4 }));
  const sent = tableSent(page);
  const [scrollbar] = controls(page);
  assert.ok(scrollbar !== undefined, "the list's scroll bar is its control");
  const beside = scrollbar.column;
  assert.deepEqual(
    sent,
    table(
      [
        ...KEYS,
        ...HOVER,
        press("logview_1"),
        wheel("logview_1"),
        press("scrollbar_2"),
        release("scrollbar_2"),
        wheel("scrollbar_2"),
        press("badges_3"),
        wheel("badges_3"),
        DRAG,
      ],
      [cellsRect("logview_1", BODY_ROW, 0, beside, 4), cellsRect("scrollbar_2", BODY_ROW, beside, COLUMNS - beside, 4), rowsRect("badges_3", BODY_ROW + 4)],
    ),
  );
  page.fire(1, "wheel_logview_1", { kind: "wheel", dx: 0, dy: -NOTCH, column: 5, row: BODY_ROW + 1, mods: NO_MODS }, 1, { rect: "logview_1" });
  assert.match(row(page, BODY_ROW + 4), /PAUSED/u, "the wheel its rule sent scrolled it back");
});

test("RULE-54: a canvas that follows the pointer asks for every move over its cells with no button held, and leaves a drag's to the page's rule, so no move is sent twice", () => {
  const page = viewer(h(PaintCanvas, { columns: 30, rows: 8, brush: true }));
  const noButton: RuleCondition = { and: [0, 1, 2].map((button): RuleCondition => ({ read: { of: "button", button }, op: "==", value: 0 })) };
  assert.deepEqual(
    tableSent(page),
    table(
      [
        ...KEYS,
        press("paintcanvas_1"),
        release("paintcanvas_1"),
        { name: "move_paintcanvas_1", on: { event: "move", target: { rect: "paintcanvas_1" }, held: false }, when: noButton, do: REPORT },
        DRAG,
      ],
      [rowsRect("paintcanvas_1", BODY_ROW, 8)],
    ),
  );
  const before = page.publications().length;
  page.fire(
    1,
    "move_paintcanvas_1",
    { kind: "mouse", action: "move", buttons: { left: false, middle: false, right: false }, column: 12, row: BODY_ROW + 2, mods: NO_MODS },
    1,
    { rect: "paintcanvas_1" },
  );
  assert.ok(page.publications().length > before, "the move its rule sent draws the brush where the pointer is");
});

test("RULE-54: a chart whose bars say what they are under the pointer asks for the pointer coming onto its controls and leaving them", () => {
  const page = viewer(
    h(BarChart, {
      bars: [
        { label: "Mon", value: 3 },
        { label: "Tue", value: 6 },
      ],
      onChoose: () => {},
    }),
  );
  assert.deepEqual(tableSent(page), table([...SELECTION, ...HOVER, press("barchart_1")], [rowsRect("barchart_1", BODY_ROW, 2)]));
  const tuesday = controlBy(page, "Tue");
  page.fire(1, "hover_in", { kind: "hover", action: "enter", column: tuesday.column, row: tuesday.row }, 1, { control: 2 });
  assert.match(row(page, HINT_ROW), /Tue: 6/u, "the hover its rule sent says what the bar is");
  page.fire(1, "hover_out", { kind: "hover", action: "leave", column: tuesday.column, row: tuesday.row }, 2, { control: 2 });
  assert.doesNotMatch(row(page, HINT_ROW), /Tue: 6/u);
});
