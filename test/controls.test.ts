// Which of a page's components declare controls, and
// where: only what a click reaches, on the first sub-page.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Harness } from "neottx-server-ts-protocol/testing";
import {
  At,
  BAR_CELLS,
  Button,
  CheckboxGroup,
  type Child,
  ChoiceList,
  Component,
  ComponentChannel,
  Dialog,
  type Element,
  Frame,
  Gap,
  h,
  Layers,
  Modal,
  PageLink,
  readControls,
  Switch,
  Text,
} from "../src/index.ts";
import { Colour, COLUMNS, Key } from "../src/kit.ts";
import { PAGE, PROMPTS, BODY_ROW, frame, latestTti, controlsOf, inOrder, harness, viewer, Watcher } from "./controls-fixtures.ts";

test("a button's band is a control: from its New Background cell to the cell before its Black Background; a disabled one declares none", () => {
  const width = Button.widthOf("press");
  const seen = harness([
    {
      page: PAGE,
      title: "Test",
      root: (): Element => frame("Buttons", h(Button, { label: "press", onPress: () => {} }), h(Button, { label: "off", disabled: true, onPress: () => {} })),
    },
  ]);
  seen.join(1, PAGE);
  assert.deepEqual(controlsOf(seen, PAGE), [{ row: BODY_ROW, column: 1, width: width - 2, height: 1 }]);
  assert.doesNotMatch(latestTti(seen, PAGE), /^IM,/mu, "the page asks for no input: every event is sent (INPUT.md section 6.3)");
});

test("a list's rows are controls, a taller item's rows joined, and its page stays one copy every viewer shares", () => {
  const components = new ComponentChannel([
    {
      page: PAGE,
      title: "Test",
      root: (): Element => frame("Rows", h(ChoiceList, { items: ["first", "second"], shown: 4, itemRows: 2, shared: true, onChoose: () => {} })),
    },
  ]);
  assert.equal(components.perViewer(PAGE), false);
  const seen = new Harness([components]);
  seen.join(1, PAGE);
  // Its rows beside the scroll bar: the band from its New Background to the cell before the Black Background in the rows' last cell.
  const width = COLUMNS - BAR_CELLS - 2;
  assert.deepEqual(controlsOf(seen, PAGE), [
    { row: BODY_ROW, column: 1, width, height: 2 },
    { row: BODY_ROW + 2, column: 1, width, height: 2 },
  ]);
});

test("a disabled list declares no controls", () => {
  const seen = harness([
    {
      page: PAGE,
      title: "Test",
      root: (): Element => frame("Rows", h(ChoiceList, { items: ["first", "second"], shown: 2, disabled: true, onChoose: () => {} })),
    },
  ]);
  seen.join(1, PAGE);
  assert.deepEqual(controlsOf(seen, PAGE), []);
  assert.ok(!latestTti(seen, PAGE).includes("OL,26,"), "no packet X/26");
});

test("a dialog over a page has the controls: the buttons under it cannot be clicked, so they declare none", () => {
  const seen = harness([
    {
      page: PAGE,
      title: "Test",
      root: (): Element =>
        frame("Modal", h(Modal, { dialog: h(Dialog, { title: "Sure?", buttons: ["Yes", "No"] }), row: 0 }, h(Button, { label: "under", onPress: () => {} }))),
    },
  ]);
  seen.join(1, PAGE);
  // Each answer's band, its New Background, its ink's cell and its label, on the dialog's buttons' row: none on the button under it, on the body's first row.
  const [yes, no, ...more] = controlsOf(seen, PAGE);
  assert.deepEqual(more, []);
  assert.ok(yes !== undefined && no !== undefined && yes.row > BODY_ROW);
  assert.deepEqual([yes.width, no.width, no.row], ["Yes".length + 2, "No".length + 2, yes.row]);
});

test("a move with no button held goes, as a click does, to the component drawn in its cell and up from it, and nowhere else (INPUT.md section 9.8)", () => {
  const seen: string[] = [];
  const page = viewer(h(Watcher, { seen }, h(Text, { text: "inside" })), h(Text, { text: "below" }));
  assert.deepEqual(controlsOf(page, PAGE), [], "nothing declared for it");
  page.move(1, 0, 3, BODY_ROW);
  page.move(1, 0, 10, BODY_ROW + 2);
  page.move(1, 0, 3, BODY_ROW + 4);
  assert.deepEqual(seen, ["move 0 0,3", "move 0 2,10"], "over the text inside it, up to it; over its own cells; not over the text below it");
});

test("only the first sub-page declares controls: a click is found on its cells alone, so a hand on another would point at the first's component", () => {
  class Two extends Component {
    override render(): Child {
      return [
        h(Frame, { key: "one", title: "One", background: Colour.Blue, prompts: PROMPTS }, h(Button, { label: "one", onPress: () => {} })),
        h(Frame, { key: "two", title: "Two", background: Colour.Blue, prompts: PROMPTS }, h(Button, { label: "two", onPress: () => {} })),
      ];
    }
  }
  const seen = harness([{ page: PAGE, title: "Test", root: (): Element => h(Two, {}) }]);
  seen.join(1, PAGE);
  const [first, second, ...more] = readControls(latestTti(seen, PAGE));
  assert.deepEqual(more, []);
  assert.deepEqual(first, [{ row: BODY_ROW, column: 1, width: Button.widthOf("one") - 2, height: 1 }]);
  assert.deepEqual(second, []);
});

test("a click acts only on a control's cells: past a button's band, on a switch's label, past a box's text, past a link's label, nothing", () => {
  const pressed: string[] = [];
  const ticks: (readonly number[])[] = [];
  const page = viewer(
    h(Button, {
      label: "press",
      onPress: () => {
        pressed.push("press");
      },
    }),
    h(Switch, {
      label: "Sound",
      onChange: (on: boolean) => {
        pressed.push(`switch ${String(on)}`);
      },
    }),
    h(CheckboxGroup, {
      items: ["a", "b"],
      onChange: (value: readonly number[]) => {
        ticks.push(value);
      },
    }),
    h(PageLink, { page: 0x151, label: "Next" }),
  );
  const [button, chip, boxA, boxB, link, ...more] = inOrder(controlsOf(page, PAGE));
  assert.deepEqual(more, []);
  assert.deepEqual(button, { row: BODY_ROW, column: 1, width: Button.widthOf("press") - 2, height: 1 });
  assert.deepEqual(chip, { row: BODY_ROW + 1, column: 25, width: " OFF".length + 2, height: 1 }, "the chip's band, after the label's 24 cells");
  assert.deepEqual([boxA?.row, boxB?.row, link?.row], [BODY_ROW + 2, BODY_ROW + 3, BODY_ROW + 4]);
  page.clickLeft(1, 20, BODY_ROW);
  page.clickLeft(1, 5, BODY_ROW + 1);
  page.clickLeft(1, 30, BODY_ROW + 2);
  page.clickLeft(1, 20, BODY_ROW + 4);
  assert.deepEqual([pressed, ticks, page.gotos(1)], [[], [], []]);
  page.clickLeft(1, 5, BODY_ROW);
  page.clickLeft(1, 27, BODY_ROW + 1);
  page.clickLeft(1, 3, BODY_ROW + 2);
  page.clickLeft(1, 3, BODY_ROW + 4);
  assert.deepEqual([pressed, ticks, page.gotos(1)], [["press", "switch true"], [[0]], [0x151]]);
});

test("a dialog's button answers only on its band, not on the dialog's background after it", () => {
  const answers: (number | null)[] = [];
  const page = viewer(
    h(Dialog, {
      title: "Sure?",
      buttons: ["Yes", "No"],
      onAnswer: (button: number | null) => {
        answers.push(button);
      },
    }),
  );
  const [yes] = controlsOf(page, PAGE);
  assert.ok(yes !== undefined);
  page.clickLeft(1, yes.column + yes.width, yes.row);
  assert.deepEqual(answers, []);
  page.clickLeft(1, yes.column, yes.row);
  assert.deepEqual(answers, [0]);
});

test("a layer placed with At covers only what it places: the button under it keeps its control and its click", () => {
  const pressed: string[] = [];
  const page = viewer(
    h(
      Layers,
      {},
      h(Button, {
        label: "under",
        onPress: () => {
          pressed.push("under");
        },
      }),
      h(At, { row: 5, column: 0 }, h(Text, { text: "over" })),
    ),
  );
  assert.deepEqual(controlsOf(page, PAGE), [{ row: BODY_ROW, column: 1, width: Button.widthOf("under") - 2, height: 1 }]);
  page.clickLeft(1, 3, BODY_ROW);
  assert.deepEqual(pressed, ["under"]);
});

test("a modal keeps every click from the page under it, beside the dialog too, declares nothing of it, and keeps the keys in the dialog", () => {
  const pressed: string[] = [];
  const answers: (number | null)[] = [];
  const seen: string[] = [];
  const page = viewer(
    h(
      Modal,
      {
        dialog: h(Dialog, {
          title: "Sure?",
          buttons: ["OK"],
          onAnswer: (button: number | null) => {
            answers.push(button);
          },
        }),
        row: 0,
      },
      h(Watcher, { seen }),
      h(Gap, { rows: 8 }),
      h(Button, {
        label: "under",
        onPress: () => {
          pressed.push("under");
        },
      }),
    ),
  );
  const under = BODY_ROW + 4 + 8;
  const [ok, ...more] = controlsOf(page, PAGE);
  assert.deepEqual(more, [], "the dialog's button alone");
  assert.ok(ok !== undefined && ok.row < under);
  page.move(1, 0, 3, BODY_ROW + 1);
  assert.deepEqual(seen, [], "a move over the page under the dialog goes to the shield, not the page");
  page.clickLeft(1, 3, under);
  page.press(1, Key.Enter);
  assert.deepEqual([pressed, answers], [[], [0]]);
});

test("a move with no button held over a scroll bar is not the bar's: it goes on up to the bar's list's parents", () => {
  const seen: string[] = [];
  const items = Array.from({ length: 12 }, (_, index) => `item ${index + 1}`);
  const page = viewer(h(Watcher, { seen }, h(ChoiceList, { items, shown: 4, onChoose: () => {} })));
  page.move(1, 0, COLUMNS - 1, BODY_ROW + 1);
  assert.deepEqual(seen, [`move 0 1,${COLUMNS - 1}`]);
});
