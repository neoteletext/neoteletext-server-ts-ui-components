// Where the keys go: back to the control that had them when a dialog
// closes, to the control nearest an arrow's way, first to a component that
// captures them, and what help says of the control that has them.

import assert from "node:assert/strict";
import { test } from "node:test";

import { text } from "neottx-server-ts-protocol/testing";
import { Button, type Child, Columns, Component, Dialog, h, JumpLabels, type KeyEvent, KeyHelp, Modal, Switch, TextField, ToastShelf } from "../src/index.ts";
import { Key } from "../src/kit.ts";
import { BODY_ROW, PAGE, viewer } from "./controls-fixtures.ts";

/** Buttons A, B and C; C opens a dialog over them. */
class Opener extends Component<{ readonly pressed: string[] }, { readonly open: boolean }> {
  override state = { open: false };

  override render(): Child {
    const press = (label: string) => (): void => {
      this.props.pressed.push(label);
      if (label === "C") {
        this.setState({ open: true });
      }
    };
    return h(
      Modal,
      {
        dialog: this.state.open
          ? h(Dialog, {
              title: "Sure?",
              buttons: ["OK"],
              onAnswer: () => {
                this.setState({ open: false });
              },
            })
          : null,
        row: 0,
      },
      ...["A", "B", "C"].map((label) => h(Button, { key: label, label, onPress: press(label) })),
    );
  }
}

test("when a dialog closes the keys go back to the control that opened it, not the page's first", () => {
  const pressed: string[] = [];
  const page = viewer(h(Opener, { pressed }));
  page.press(1, Key.Tab);
  page.press(1, Key.Tab);
  page.press(1, Key.Enter);
  assert.deepEqual(pressed, ["C"], "Tab twice reaches C, which opens the dialog");
  page.press(1, Key.Enter);
  page.press(1, Key.Enter);
  assert.deepEqual(pressed, ["C", "C"], "after the dialog, Enter presses C again");
});

/** Two buttons side by side over a third, each saying when it is pressed. */
function grid(pressed: string[]): Child[] {
  const button = (label: string): Child =>
    h(Button, {
      key: label,
      label,
      onPress: () => {
        pressed.push(label);
      },
    });
  return [h(Columns, { widths: [12, 12] }, button("left"), button("right")), button("below")];
}

test("an arrow no control takes moves the keys to the control nearest that way", () => {
  const pressed: string[] = [];
  const page = viewer(...grid(pressed));
  page.press(1, Key.Right);
  page.press(1, Key.Enter);
  page.press(1, Key.Down);
  page.press(1, Key.Enter);
  page.press(1, Key.Up);
  page.press(1, Key.Left);
  page.press(1, Key.Enter);
  assert.deepEqual(pressed, ["right", "below", "left"]);
});

/** Takes "x" before the control with the keys sees it. */
class Catcher extends Component<{ readonly caught: string[] }> {
  override onKeyCapture(event: KeyEvent): boolean {
    if (event.key === "x" && event.action === "press") {
      this.props.caught.push("x");
      return true;
    }
    return false;
  }
}

test("a component above the focused one may capture a key before it reaches it", () => {
  const caught: string[] = [];
  const pressed: string[] = [];
  const page = viewer(
    h(
      Catcher,
      { caught },
      h(Button, {
        label: "go",
        onPress: () => {
          pressed.push("go");
        },
      }),
    ),
  );
  page.press(1, "x");
  page.press(1, Key.Enter);
  assert.deepEqual(caught, ["x"]);
  assert.deepEqual(pressed, ["go"], "what it does not capture still reaches the button");
});

test("KeyHelp with no keys of its own lists those of the control that has them, and follows the focus", () => {
  const page = viewer(h(Button, { label: "go", onPress: () => {} }), h(Switch, { label: "on" }), h(KeyHelp, { keyCells: 26 }));
  const help = (): string => text(page.seen(1, PAGE).rows, BODY_ROW + 2);
  assert.match(help(), /Enter or a click.*presses/u);
  page.press(1, Key.Tab);
  assert.match(help(), /Enter, Space or a click.*turns it over/u);
});

test("jump labels: 0 puts a digit on each control, and a digit gives that control the keys", () => {
  const pressed: string[] = [];
  const page = viewer(h(JumpLabels, {}, ...grid(pressed)));
  page.press(1, "0");
  const rows = page.seen(1, PAGE).rows;
  assert.match(text(rows, BODY_ROW), /1.*2/u, "the two side by side labelled");
  assert.match(text(rows, BODY_ROW + 1), /3/u);
  page.press(1, "3");
  assert.doesNotMatch(text(page.seen(1, PAGE).rows, BODY_ROW), /1.*2/u, "the labels go");
  page.press(1, Key.Enter);
  assert.deepEqual(pressed, ["below"]);
});

test("typing reaches a field in a dialog, though the dialog keeps every key it is given", () => {
  const changed: string[] = [];
  const field = h(TextField, {
    longest: 10,
    autoFocus: true,
    onChange: (value: string) => {
      changed.push(value);
    },
  });
  const page = viewer(h(Dialog, { title: "Name?", buttons: ["OK"], childFirst: true }, field));
  page.typeKeys(1, "hi");
  assert.equal(changed.at(-1), "hi");
});

/** Says it deleted something, with a toast that undoes it. */
class Deleter extends Component<{ readonly undone: number[] }> {
  override focusable(): boolean {
    return true;
  }

  override onKey(event: KeyEvent): boolean {
    if (event.key !== Key.Enter || event.action !== "press") {
      return false;
    }
    this.services.bus.emit(
      "toast",
      {
        kind: "warning",
        text: "Deleted",
        undo: (session: number) => {
          this.props.undone.push(session);
        },
      },
      { session: event.session },
    );
    return true;
  }
}

test("a toast that can be undone says so, and the undo key undoes it once, wherever the keys are", () => {
  const undone: number[] = [];
  const page = viewer(h(Deleter, { undone }), h(ToastShelf, {}));
  page.press(1, Key.Enter);
  assert.match(text(page.seen(1, PAGE).rows, BODY_ROW), /Deleted \(u undoes\)/u);
  page.press(1, "u");
  page.press(1, "u");
  assert.deepEqual(undone, [1]);
  assert.doesNotMatch(text(page.seen(1, PAGE).rows, BODY_ROW), /Deleted/u);
});
