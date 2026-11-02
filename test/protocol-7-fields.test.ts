// What program protocol 7 brings a component (REQ-1347, DOC-1969): the
// modifier keys held on a key, the pointer and the wheel, the dot under the
// pointer, and an input method's text as it stands.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Component, type ComposeEvent, h, type KeyEvent, type PointerEvent, TextField, type WheelEvent } from "../src/index.ts";
import { Mods } from "../src/kit.ts";
import { viewer } from "./controls-fixtures.ts";

/** Control and Shift: more than one bit, so that none is lost. */
const HELD = Mods.Control | Mods.Shift;
/** A cell of the test's component, and a dot inside it: 12 dots to a cell across and 20 down (DOC-1946). */
const CELL = { column: 2, row: 4 };
const DOT = { px: 2 * 12 + 5, py: 4 * 20 + 7 };

/** Keeps the fields each event it hears comes with, those absent as absent. */
class Hears extends Component<{ readonly seen: unknown[] }> {
  override focusable(): boolean {
    return true;
  }

  override measure(space: { readonly width: number; readonly height: number }): { width: number; height: number } {
    return { width: space.width, height: 4 };
  }

  override onKey(event: KeyEvent): boolean {
    this.props.seen.push({ key: event.key, mods: event.mods });
    return true;
  }

  override onPointer(event: PointerEvent): boolean {
    this.props.seen.push({ pointer: event.action, mods: event.mods, px: event.px, py: event.py });
    return true;
  }

  override onWheel(event: WheelEvent): boolean {
    this.props.seen.push({ wheel: event.dy, mods: event.mods, px: event.px, py: event.py });
    return true;
  }

  override onCompose(event: ComposeEvent): boolean {
    this.props.seen.push({ compose: event.text, cursor: event.cursor });
    return true;
  }
}

test("a key comes with the modifiers held, so Control-C is not c (DOC-1935)", () => {
  const seen: unknown[] = [];
  const page = viewer(h(Hears, { seen }));
  page.send(1, { kind: "key", action: "press", key: "c", mods: Mods.Control });
  page.send(1, { kind: "key", action: "press", key: "c", text: "c" });
  assert.deepEqual(seen, [
    { key: "c", mods: Mods.Control },
    { key: "c", mods: undefined },
  ]);
});

test("a press, a move, a release and the wheel come with the modifiers and the dot (DOC-1946)", () => {
  const seen: unknown[] = [];
  const page = viewer(h(Hears, { seen }));
  page.send(1, { kind: "mouse", action: "press", button: 0, ...CELL, mods: HELD, ...DOT });
  page.send(1, { kind: "mouse", action: "move", buttons: 1, ...CELL, mods: HELD, ...DOT });
  page.send(1, { kind: "mouse", action: "release", button: 0, ...CELL, mods: HELD, ...DOT });
  page.send(1, { kind: "wheel", dx: 0, dy: 120, ...CELL, mods: HELD, ...DOT });
  assert.deepEqual(seen, [
    { pointer: "press", mods: HELD, ...DOT },
    { pointer: "move", mods: HELD, ...DOT },
    { pointer: "release", mods: HELD, ...DOT },
    { wheel: 120, mods: HELD, ...DOT },
  ]);
});

test("a pointer with no modifier and no dot known says nothing of them", () => {
  const seen: unknown[] = [];
  const page = viewer(h(Hears, { seen }));
  page.send(1, { kind: "mouse", action: "press", button: 0, ...CELL });
  page.send(1, { kind: "wheel", dx: 0, dy: 120, ...CELL });
  assert.deepEqual(seen, [
    { pointer: "press", mods: undefined, px: undefined, py: undefined },
    { wheel: 120, mods: undefined, px: undefined, py: undefined },
  ]);
});

test("an input method's text as it stands goes to the component with the keys, and its end too (DOC-1969)", () => {
  const seen: unknown[] = [];
  const page = viewer(h(Hears, { seen }));
  page.send(1, { kind: "mouse", action: "press", button: 0, ...CELL });
  seen.length = 0;
  page.send(1, { kind: "compose", cursor: 2, text: "ni\u{7684}" });
  page.send(1, { kind: "compose", cursor: 0, text: "" });
  assert.deepEqual(seen, [
    { compose: "ni\u{7684}", cursor: 2 },
    { compose: "", cursor: 0 },
  ]);
});

test("a text field types nothing for a key with Control held, which brings no text, and nothing of a composition until it is committed", () => {
  const typed: string[] = [];
  const page = viewer(
    h(TextField, {
      longest: 20,
      autoFocus: true,
      onChange: (value: string) => {
        typed.push(value);
      },
    }),
  );
  page.send(1, { kind: "key", action: "press", key: "c", mods: Mods.Control });
  page.send(1, { kind: "compose", cursor: 1, text: "n" });
  page.send(1, { kind: "key", action: "press", key: "C", mods: Mods.Shift, text: "C" });
  assert.deepEqual(typed, ["C"]);
});
