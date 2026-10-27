// The pointer on the library's controls: clicks act only on a control's
// cells, the wheel scrolls and steps, and a hover says what a row is.

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  Action,
  Badges,
  Breadcrumbs,
  Button,
  ChoiceList,
  DataTable,
  h,
  type LogEntry,
  LogView,
  Menu,
  NumberInput,
  Slider,
  TextField,
  ToastShelf,
  ToggleList,
  Tree,
  type TreeNode,
} from "../src/index.ts";
import { Key } from "../src/kit.ts";
import { BODY_ROW, NOTCH, viewer, controls, row, controlBy, click, enterAndLeave, RaiseToast } from "./mouse-fixtures.ts";

test("an action is a control over its text from its first character; a click there acts, beside it does not; disabled, it declares nothing; it never takes the keys", () => {
  const pressed: string[] = [];
  const page = viewer(
    h(Button, {
      label: "keys",
      onPress: () => {
        pressed.push("button");
      },
    }),
    h(Action, {
      text: "Do it",
      onPress: () => {
        pressed.push("action");
      },
    }),
    h(Action, {
      text: "Not now",
      disabled: true,
      onPress: () => {
        pressed.push("never");
      },
    }),
  );
  const action = controlBy(page, "Do it");
  assert.deepEqual(action, { row: BODY_ROW + 1, column: 1, width: "Do it".length, height: 1 });
  assert.equal(controls(page).length, 2, "the button and the action, not the disabled action");
  page.clickLeft(1, action.column + action.width, action.row);
  click(page, action);
  page.press(1, Key.Enter);
  assert.deepEqual(pressed, ["action", "button"], "the click past its text took nothing; Enter still went to the button");
});

test("a badge with onPress is a control over its chip; a log's PAUSED badge follows the newest again when clicked", () => {
  const pressed: number[] = [];
  const page = viewer(
    h(Badges, {
      badges: [
        { text: "PLAIN" },
        {
          text: "PRESS",
          onPress: (session: number): void => {
            pressed.push(session);
          },
        },
      ],
    }),
  );
  const [badge, ...more] = controls(page);
  assert.ok(badge !== undefined && more.length === 0, "only the badge with onPress");
  click(page, badge);
  assert.deepEqual(pressed, [1]);

  const entries: LogEntry[] = Array.from({ length: 12 }, (_, index) => ({ at: Date.UTC(2026, 9, 28, 3, 0, index), level: "info", text: `entry ${index}` }));
  const log = viewer(h(LogView, { entries, shown: 4 }));
  assert.match(row(log, BODY_ROW + 4), /LIVE/u);
  log.wheel(1, -NOTCH, 5, BODY_ROW + 1);
  assert.match(row(log, BODY_ROW + 4), /PAUSED/u, "scrolled back");
  click(log, controlBy(log, "PAUSED"));
  assert.match(row(log, BODY_ROW + 4), /LIVE/u, "following again");
  assert.match(row(log, BODY_ROW + 3), /entry 11/u, "the newest at the bottom");
});

test("a crumb with an action is a control a click acts on; a menu's way down is one, and a click on a menu's name goes back to it", () => {
  const pressed: string[] = [];
  const crumbs = viewer(
    h(Breadcrumbs, {
      trail: [
        {
          label: "Top",
          onPress: (): void => {
            pressed.push("top");
          },
        },
        { label: "Here" },
      ],
    }),
  );
  click(crumbs, controlBy(crumbs, "Top"));
  assert.deepEqual(pressed, ["top"]);

  const page = viewer(
    h(Menu, { title: "Main", items: [{ label: "Tools", items: [{ label: "Saw", items: [{ label: "Blade" }] }] }, { label: "Help" }], onChoose: () => {} }),
  );
  page.press(1, Key.Enter);
  page.press(1, Key.Enter);
  // The English set's → is 0x5D (EN 300 706 Table 36), which the row's text shows as "]"; the arrows are blue.
  // oxlint-disable-next-line eslint/no-control-regex -- a teletext row holds its colour codes; the test reads them
  assert.match(row(page, BODY_ROW), /Main.\]\u0006Tools.\]\u0007Saw/u, "two menus down, the one open white");
  assert.match(row(page, BODY_ROW + 1), /Blade/u);
  const [main, tools] = controls(page).filter((control) => control.row === BODY_ROW);
  assert.ok(main !== undefined && tools !== undefined, "the two menus above are controls; the one open is not");
  click(page, tools);
  assert.match(row(page, BODY_ROW + 1), /Saw/u, "back to Tools");
  click(page, controlBy(page, "Main"));
  assert.match(row(page, BODY_ROW), /Main/u);
  assert.match(row(page, BODY_ROW + 1), /Tools/u, "back to the top");
  assert.match(row(page, BODY_ROW + 2), /Help/u);
});

test("a list's user hears the pointer come onto a row and leave it: a choice list's index, a toggle list's, a tree's node, a menu's path, a table's row", () => {
  const heard: unknown[] = [];
  const hear = (value: unknown): void => {
    heard.push(value);
  };
  const choices = viewer(h(ChoiceList, { items: ["one", "two"], shown: 2, onChoose: () => {}, onHover: hear }));
  enterAndLeave(choices, controlBy(choices, "two"));
  const toggles = viewer(h(ToggleList, { items: ["one", "two"], onHover: hear }));
  enterAndLeave(toggles, controlBy(toggles, "two"));
  const nodes: TreeNode[] = [{ label: "root", children: [{ label: "leaf" }] }];
  const tree = viewer(
    h(Tree, {
      nodes,
      shown: 3,
      open: ["root"],
      onHover: (node: TreeNode | null) => {
        hear(node?.label ?? null);
      },
    }),
  );
  enterAndLeave(tree, controlBy(tree, "leaf"));
  const menu = viewer(h(Menu, { title: "Main", items: [{ label: "Tools", items: [{ label: "Saw" }] }], onChoose: () => {}, onHover: hear }));
  menu.press(1, Key.Enter);
  enterAndLeave(menu, controlBy(menu, "Saw"));
  const table = viewer(h(DataTable, { columns: [{ title: "Name", width: 10 }], rows: [["b"], ["a"]], shown: 2, selectable: true, onHover: hear }));
  // Under the heading's controls, the table's rows: b, then a.
  const [, second] = controls(table).filter((control) => control.row > BODY_ROW);
  assert.ok(second !== undefined, "the table's second row, a");
  enterAndLeave(table, second);
  assert.deepEqual(heard, [1, null, 1, null, "leaf", null, ["Tools", "Saw"], null, ["a"], null]);
});

test("the wheel scrolls a tree and a menu with more than they show", () => {
  const nodes: TreeNode[] = Array.from({ length: 8 }, (_, index) => ({ label: `node ${index}` }));
  const tree = viewer(h(Tree, { nodes, shown: 3 }));
  tree.wheel(1, 2 * NOTCH, 5, BODY_ROW);
  assert.match(row(tree, BODY_ROW), /node 2/u);
  const menu = viewer(h(Menu, { items: Array.from({ length: 8 }, (_, index) => ({ label: `choice ${index}` })), shown: 3, onChoose: () => {} }));
  menu.wheel(1, NOTCH, 5, BODY_ROW);
  assert.match(row(menu, BODY_ROW), /choice 1/u);
});

test("a text field's band is a control, and a click there gives it the keys", () => {
  const typed: string[] = [];
  const page = viewer(
    h(Button, { label: "first", onPress: () => {} }),
    h(TextField, {
      label: "Name",
      longest: 10,
      onChange: (value: string) => {
        typed.push(value);
      },
    }),
  );
  // The band, from its prompt; the label before it is not the field's.
  const field = controlBy(page, "> ");
  page.typeText(1, "x");
  assert.deepEqual(typed, [], "the button has the keys");
  click(page, field);
  page.typeText(1, "ab");
  assert.deepEqual(typed, ["ab"]);
});

test("the wheel steps a slider and a number, up for more", () => {
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
    h(NumberInput, {
      label: "Count",
      min: 0,
      max: 9,
      initial: 3,
      onChange: (value: number) => {
        values.push(value);
      },
    }),
  );
  page.wheel(1, -NOTCH, 20, BODY_ROW);
  page.wheel(1, 2 * NOTCH, 20, BODY_ROW + 1);
  assert.deepEqual(values, [6, 1], "two notches in one turn are two steps at once");
});

test("a toast is a control, and a click puts it away before its time", () => {
  const page = viewer(h(ToastShelf, {}), h(RaiseToast, {}));
  click(page, controlBy(page, "raise"));
  const toast = controlBy(page, "Saved");
  assert.equal(toast.row, BODY_ROW, "the shelf's first row");
  click(page, toast);
  assert.doesNotMatch(row(page, BODY_ROW), /Saved/u);
  assert.equal(controls(page).length, 1, "the action alone");
});
