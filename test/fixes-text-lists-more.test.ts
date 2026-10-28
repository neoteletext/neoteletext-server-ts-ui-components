// What a table keeps within its box and its rows, what a filtered list does
// as the viewer types, how a day's headlines go over sub-pages, what a QR
// panel without a code says, and what a disabled or finished wizard asks
// of the keys.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Harness, text } from "neottx-server-ts-protocol/testing";
import {
  type Article,
  Button,
  type Child,
  Component,
  ComponentChannel,
  DataTable,
  DayPages,
  type Element,
  FilterList,
  h,
  type KeyEvent,
  QrPanel,
  Table,
  TextField,
  Wizard,
} from "../src/index.ts";
import { CUT_MARK } from "../src/core/text.ts";
import { HINT_ROW } from "../src/frame/frame.ts";
import { Colour, Key, MOST_SUBPAGES } from "../src/kit.ts";
import { BODY_ROW, PAGE, PROMPTS, viewer } from "./controls-fixtures.ts";

/** Every row of the viewer's page, as text, once the channel reported no failure. */
function lines(page: Harness): string[] {
  assert.deepEqual(page.errors, [], "the channel reported no failure");
  const { rows } = page.seen(1, PAGE);
  return rows.map((_, row) => text(rows, row));
}

interface ShrinkingProps {
  readonly rows: readonly string[];
  readonly shown: number;
  readonly chosen: string[];
}

/** The first rows the table's rows shrink to. */
const LEFT = 2;

/** A table of `rows`, and of their first LEFT once "x" is pressed. */
class Shrinking extends Component<ShrinkingProps, { readonly rows: readonly string[] }> {
  override state = { rows: this.props.rows };

  override onKey(event: KeyEvent): boolean {
    if (event.key === "x" && event.action === "press") {
      this.setState({ rows: this.props.rows.slice(0, LEFT) });
      return true;
    }
    return false;
  }

  override render(): Child {
    return h(DataTable, {
      columns: [{ title: "Name", width: 12 }],
      rows: this.state.rows.map((row) => [row]),
      shown: this.props.shown,
      selectable: true,
      onChoose: (row: readonly string[]) => {
        this.props.chosen.push(row[0] ?? "");
      },
    });
  }
}

/** `rows` in a table showing `shown`, the last chosen, then shrunk to LEFT. */
function shrunk(rows: readonly string[], shown: number, chosen: string[]): Harness {
  const page = viewer(h(Shrinking, { rows, shown, chosen }));
  for (let step = 1; step < rows.length; step += 1) {
    page.press(1, Key.Down);
  }
  page.press(1, "x");
  return page;
}

test("a table whose rows shrink under its chosen row, with no rows' keys, keeps its choice within them", () => {
  const chosen: string[] = [];
  const page = shrunk(["a", "b", "c", "d", "e"], 5, chosen);
  page.press(1, Key.Enter);
  assert.deepEqual(chosen, ["b"], "the last row there is now is chosen");
});

test("a table scrolled past the rows it shrinks to shows them", () => {
  const rows = lines(shrunk(["alpha", "bravo", "charlie", "delta", "echo", "foxtrot"], 2, []));
  for (const row of ["alpha", "bravo"]) {
    assert.ok(
      rows.some((line) => line.includes(row)),
      `${row} is shown`,
    );
  }
});

test("a table's label column is kept within its box, the label cut with the mark", () => {
  const label = "A label longer than the row is wide, by some way";
  for (const labelCells of [100, Number.POSITIVE_INFINITY]) {
    const row = lines(viewer(h(Table, { rows: [[label, "value"]], labelCells }))).at(BODY_ROW) ?? "";
    assert.ok(row.trimEnd().endsWith(CUT_MARK), `${labelCells}: the label is cut with the mark, not at the box's edge: ${JSON.stringify(row)}`);
  }
});

const FRUIT = ["apple", "banana", "cherry", "apricot"];

/** A filtered list of FRUIT, its choices kept, under a button that has the keys first; Down gives them to the list. */
function fruitList(chosen: string[]): Harness {
  const page = viewer(
    h(Button, {
      label: "Clear",
      onPress: () => {
        chosen.push("the button");
      },
    }),
    h(FilterList<string>, {
      items: FRUIT,
      text: String,
      shown: 4,
      onChoose: (index: number) => {
        chosen.push(FRUIT[index] ?? "");
      },
    }),
  );
  page.press(1, Key.Down);
  return page;
}

test("typing in a filtered list takes the choice to the best match, not to the item it was on", () => {
  const chosen: string[] = [];
  const page = fruitList(chosen);
  for (let step = 0; step < 3; step += 1) {
    page.press(1, Key.Down);
  }
  page.typeText(1, "a");
  page.press(1, Key.Enter);
  assert.deepEqual(chosen, ["apple"], "the top row, which begins with what is typed, the list keeping the keys");
});

test("what a filtered list keeps of what is typed is counted in characters, not in UTF-16 units", () => {
  const page = fruitList([]);
  /** Characters each two UTF-16 units, fewer than a line's worth: kept whole. */
  const typed = `${"\u{1F600}".repeat(20)}z`;
  page.typeText(1, typed);
  assert.match((lines(page).find((line) => line.includes("Find:")) ?? "").trimEnd(), /z$/u, "the last character typed is kept");
});

/** An article on `page`, of a headline one line long. */
function article(page: number): Article {
  return { page, title: `Story ${page.toString(16)}`, writer: "A writer", date: 0, blocks: [], tags: [] };
}

/** The sub-pages of a whole page of `root`, as viewer 1 sees them. */
function subPages(root: () => Element): ReturnType<Harness["sharedPages"]> {
  const page = new Harness([new ComponentChannel([{ page: PAGE, title: "Test", perViewer: true, root }])]);
  page.join(1, PAGE);
  assert.deepEqual(page.errors, [], "the channel reported no failure");
  return page.ownPages(1, PAGE) ?? page.sharedPages(PAGE);
}

test("a day of more headlines than a sub-page holds goes on over further sub-pages, named with their places", () => {
  const count = 30;
  const articles = Array.from({ length: count }, (_, index) => article(0x200 + index));
  const sub = subPages(() => h(DayPages, { background: Colour.Blue, prompts: PROMPTS, days: [{ name: "Today", articles }] }));
  const all = sub.flatMap((each) => each.rows.map((_, row) => text(each.rows, row)));
  for (const each of articles) {
    assert.ok(
      all.some((line) => line.includes(each.title)),
      `${each.title} is on a sub-page`,
    );
  }
  assert.deepEqual(
    sub.map((each) => /Today \d\/\d/u.exec(text(each.rows, 1))?.[0]),
    ["Today 1/2", "Today 2/2"],
  );
});

test("a day of more headlines than every sub-page holds stops at the most sub-pages a page has", () => {
  const articles = Array.from({ length: 20 * (MOST_SUBPAGES + 1) }, (_, index) => article(0x200 + index));
  assert.equal(subPages(() => h(DayPages, { background: Colour.Blue, prompts: PROMPTS, days: [{ name: "Today", articles }] })).length, MOST_SUBPAGES);
});

test("a QR panel without a code says nothing of scanning, and its placeholder is in line with its text", () => {
  const rows = lines(viewer(h(QrPanel, { what: "The full article", title: "Council approves the new bridge" })));
  assert.ok(!rows.some((row) => row.includes("Scan")), "nothing to scan");
  const placeholder = rows.findIndex((row) => row.includes("(no QR tool)"));
  assert.ok(placeholder >= 0, "the placeholder is drawn");
  assert.equal(
    placeholder,
    rows.findIndex((row) => row.includes("The full")),
    "on the row the text starts on",
  );
});

test("a disabled wizard takes no coloured key, nor asks the page for them", () => {
  const steps: number[] = [];
  const wizard = {
    steps: ["Name", "Done"],
    disabled: true,
    onStep: (step: number): void => {
      steps.push(step);
    },
  };
  const page = viewer(h(Wizard, wizard, h(TextField, { label: "Name", longest: 10 }), h(TextField, { label: "Other", longest: 10 })));
  page.press(1, Key.Green);
  assert.deepEqual(steps, [], "Next from a field in it does nothing");
  assert.notEqual(new Wizard(wizard).needs().colourKeys, true, "the page keeps the coloured keys");
});

test("a finished wizard's hint offers neither Back nor Next", () => {
  const page = viewer(h(Wizard, { steps: ["Only"] }, h(TextField, { label: "Name", longest: 10 })));
  page.press(1, Key.Green);
  const hint = lines(page)[HINT_ROW] ?? "";
  assert.ok(
    lines(page).some((row) => row.includes("All done")),
    "it is finished",
  );
  assert.doesNotMatch(hint, /Back|Next/u);
});
