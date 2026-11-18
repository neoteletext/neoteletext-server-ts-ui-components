// REQ-6539, page-rules.md RULE-54: when the library sends a page's rule
// table, what it writes for a page with more than a table holds, and that
// the table of every example in the catalogue is one the server takes.

import assert from "node:assert/strict";
import { test } from "node:test";

import { fakeOpus, Harness } from "neoteletext-server-ts-protocol/testing";
import {
  Action,
  Component,
  ComponentChannel,
  type Element,
  h,
  MOST_RECTS,
  MOST_RULES,
  NO_POINTER_INPUT,
  type PointerEvent,
  type PointerInput,
  Rows,
  Text,
  TextField,
} from "../src/index.ts";
import { COLUMNS, ROWS } from "../src/kit.ts";
import { exampleName } from "./catalogue/example.ts";
import { PARTS } from "./catalogue/index.ts";
import { frame } from "./components-fixtures.ts";
import { BODY_ROW, controlBy, PAGE, viewer } from "./mouse-fixtures.ts";
import {
  CELL_ACROSS,
  CELL_DOWN,
  HOVER,
  KEYS,
  PAGE_ACROSS,
  PAGE_DOWN,
  press,
  rowsRect,
  rulesSent,
  table,
  tableSent,
  TEXT,
  wheel,
} from "./page-rules-fixtures.ts";

/** A row that takes a click. */
class Spot extends Component {
  override measure(): { width: number; height: number } {
    return { width: COLUMNS, height: 1 };
  }

  override onClick(event: PointerEvent): boolean {
    return event.button === 0;
  }
}

/** A row the wheel turns over: beside a spot, an area of its own. */
class Turned extends Component {
  override measure(): { width: number; height: number } {
    return { width: COLUMNS, height: 1 };
  }

  override onWheel(): boolean {
    return true;
  }
}

/** A cell that stops the pointer and uses none of it, as a modal's shield does. */
class Stop extends Spot {
  override pointerInput(): PointerInput {
    return NO_POINTER_INPUT;
  }
}

/** A spot and a row the wheel turns over, by turns: each row an area of its own, since what is taken on it differs from the rows beside it. */
function rows(count: number): Element[] {
  return Array.from({ length: count }, (_, index) => (index % 2 === 0 ? h(Spot, { key: index }) : h(Turned, { key: index })));
}

test("RULE-54: a page with more areas than a table has rectangles asks the whole page, by the default table's names", () => {
  assert.deepEqual(
    tableSent(viewer(...rows(3))),
    table(
      [press("spot_1"), wheel("turned_2"), press("spot_3")],
      [rowsRect("spot_1", BODY_ROW), rowsRect("turned_2", BODY_ROW + 1), rowsRect("spot_3", BODY_ROW + 2)],
    ),
  );
  const send = [{ action: "send" }] as const;
  const many = viewer(...rows(MOST_RECTS + 1));
  assert.deepEqual(
    tableSent(many),
    table([
      { name: "press", on: { event: "press", target: "page", button: "any" }, do: send },
      { name: "wheel", on: { event: "wheel", target: "page" }, do: send },
    ]),
  );
  const logged = many.sent.filter((each) => each["type"] === "log").map((each) => String(each["text"]));
  assert.deepEqual(
    logged,
    [
      `page 150: ${MOST_RECTS + 1} pointer areas and ${MOST_RECTS + 1} rules, of the ${MOST_RECTS} rectangles and ${MOST_RULES} rules a rule table holds; the pointer is asked for over the whole page`,
    ],
    "the channel's log says, as the table is sent, that the page asks more widely than its components take",
  );
});

test("RULE-54: a component that says it takes nothing of the pointer is asked nothing for, whatever handlers it has", () => {
  assert.deepEqual(tableSent(viewer(h(Stop, {}))), { rules: [] });
});

/** A page that shows a field once its action is pressed. */
class Opens extends Component<object, { readonly open: boolean }> {
  override state = { open: false };

  override render(): Element {
    return this.state.open
      ? h(TextField, { label: "Name", longest: 10 })
      : h(Action, {
          text: "Open",
          onPress: () => {
            this.setState({ open: true });
          },
        });
  }
}

test("RULE-54: a page's table is sent again when its components come to take something else, and not while they take the same", () => {
  const page = viewer(h(Opens, {}));
  assert.deepEqual(tableSent(page), table([...HOVER, press("action_1")], [rowsRect("action_1", BODY_ROW)]));
  const open = controlBy(page, "Open");
  page.hover(1, "enter", open.column, open.row);
  assert.equal(rulesSent(page).length, 1, "a hover changes the hint row and no component: the same table is not sent twice");
  page.clickLeft(1, open.column, open.row);
  assert.deepEqual(tableSent(page), table([...KEYS, TEXT, ...HOVER, press("textfield_1")], [rowsRect("textfield_1", BODY_ROW)]));
  assert.equal(rulesSent(page).length, 2);
  page.open(1, 0x100);
  page.open(1, PAGE);
  assert.equal(rulesSent(page).length, 3, "opened again, the page's table is sent again: the server keeps so many of a connection's tables only");
});

test("RULE-54: connections given the same table of a shared page are named in one message", () => {
  const page = new Harness([new ComponentChannel([{ page: PAGE, title: "Shared", root: (): Element => frame("Shared", h(Opens, {})) }], { opus: fakeOpus() })]);
  page.join(1, PAGE);
  page.join(2, PAGE);
  const open = controlBy(page, "Open");
  page.clickLeft(1, open.column, open.row);
  const last = rulesSent(page).at(-1);
  assert.deepEqual(last, {
    type: "rules",
    connections: [1, 2],
    page: "150",
    table: table([...KEYS, TEXT, ...HOVER, press("textfield_1")], [rowsRect("textfield_1", BODY_ROW)]),
  });
});

test("RULE-48: a fault a receiver reports of a page's table is written to the channel's log", () => {
  const page = viewer(h(Text, { text: "words" }));
  page.channel.rulesFault({ type: "rules_fault", connection: 1, page: "150", generation: 1, fault: "sends_dropped", count: 4 });
  assert.ok(
    page.sent.some((each) => each["type"] === "log" && String(each["text"]).includes("rule table fault sends_dropped, 4 times")),
    "the log says which fault, and how often",
  );
});

/** A name of a rule or a rectangle as the server takes it (page-rules.md RULE-36). */
const NAME = /^[a-z][a-z0-9_]{0,31}$/u;

for (const part of PARTS) {
  for (const example of part.examples) {
    test(`RULE-54: ${part.part}: ${exampleName(example)}'s table is one the server takes: within its limits, its names distinct, its rectangles on the page and sharing no dot`, () => {
      const channel = new ComponentChannel(
        [
          {
            page: PAGE,
            title: example.component,
            perViewer: true,
            root: (): Element => (example.whole === true ? h(Rows, {}, example.build()) : frame(example.component, example.build())),
          },
          ...(example.pages ?? []),
        ],
        { opus: fakeOpus() },
      );
      const page = new Harness([channel]);
      page.join(1, PAGE);
      example.act?.(page);
      const rules = channel.viewerMount(1, PAGE)?.rules?.table;
      assert.ok(rules !== undefined, "the page has a table");
      const rects = rules.rects ?? [];
      assert.ok(rules.rules.length <= MOST_RULES && rects.length <= MOST_RECTS);
      for (const names of [rules.rules.map((each) => each.name), rects.map((each) => each.name)]) {
        assert.deepEqual(
          names.filter((name, index) => !NAME.test(name) || name === "page" || names.indexOf(name) !== index),
          [],
        );
      }
      const dots = new Set<number>();
      for (const rect of rects) {
        assert.ok(
          rect.x >= 0 && rect.y >= 0 && rect.width > 0 && rect.height > 0 && rect.x + rect.width <= PAGE_ACROSS && rect.y + rect.height <= PAGE_DOWN,
          rect.name,
        );
        for (let cellRow = rect.y / CELL_DOWN; cellRow < (rect.y + rect.height) / CELL_DOWN; cellRow += 1) {
          for (let column = rect.x / CELL_ACROSS; column < (rect.x + rect.width) / CELL_ACROSS; column += 1) {
            assert.ok(!dots.has(cellRow * COLUMNS + column), `${rect.name} shares a cell with another rectangle`);
            dots.add(cellRow * COLUMNS + column);
          }
        }
      }
      assert.ok(dots.size <= ROWS * COLUMNS);
      assert.deepEqual(page.errors, []);
    });
  }
}
