// The lists and the navigation against what they are given: a list that
// shrinks under its choice acts only on items it has, a tree as deep as
// its data is still drawn, a table column wider than the page allocates
// no more than the row, a log entry of a level it does not know is still
// drawn, and tabs with none to choose report no tab.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Harness, text } from "neoteletext-server-ts-protocol/testing";
import {
  type Child,
  ChoiceList,
  Collapsible,
  Component,
  ComponentChannel,
  DataTable,
  Frame,
  h,
  type LogEntry,
  LogView,
  TabView,
  ToggleList,
  Tree,
  type TreeNode,
} from "../src/index.ts";
import { Colour, Key } from "../src/kit.ts";

const PAGE = 0x150;
const PROMPTS = [
  ["Index", 0x100],
  ["", null],
  ["", null],
  ["", null],
] as const;
/** The frame's first body row, where a page's first component is drawn. */
const BODY_ROW = 3;

/** One viewer's page of `body`, every component its own. */
function viewer(...body: Child[]): Harness {
  const seen = new Harness([
    new ComponentChannel([
      {
        page: PAGE,
        title: "Test",
        perViewer: true,
        root: (): ReturnType<typeof h> => h(Frame, { title: "Test", background: Colour.Blue, prompts: PROMPTS }, ...body),
      },
    ]),
  ]);
  seen.join(1, PAGE);
  return seen;
}

function pressAll(page: Harness, ...keys: string[]): void {
  for (const key of keys) {
    page.press(1, key);
  }
}

/** Items that lose their last whenever one is acted on: a list whose user deletes what is chosen. */
class Shrinking extends Component<{ readonly list: (items: readonly string[], shrink: () => void) => Child }, { readonly items: readonly string[] }> {
  override state = { items: ["one", "two", "three"] };

  override render(): Child {
    return this.props.list(this.state.items, () => {
      this.setState({ items: this.state.items.slice(0, -1) });
    });
  }
}

test("a choice list that shrank under its choice chooses an item it has", () => {
  const chosen: [index: number, count: number][] = [];
  const page = viewer(
    h(Shrinking, {
      list: (items, shrink) =>
        h(ChoiceList, {
          items,
          shown: 5,
          onChoose: (index: number) => {
            chosen.push([index, items.length]);
            shrink();
          },
        }),
    }),
  );
  pressAll(page, Key.End, Key.Enter, Key.Enter);
  assert.deepEqual(chosen, [
    [2, 3],
    [1, 2],
  ]);
});

test("a choice list's first choice is one of its items, whatever it is told to begin with", () => {
  const chosen: number[] = [];
  const page = viewer(
    h(ChoiceList, {
      items: ["one", "two"],
      shown: 5,
      initial: 7,
      onChoose: (index: number) => {
        chosen.push(index);
      },
    }),
  );
  page.press(1, Key.Enter);
  assert.deepEqual(chosen, [1]);
});

test("a toggle list that shrank under its choice stars only items it has", () => {
  const values: [value: readonly number[], count: number][] = [];
  const page = viewer(
    h(Shrinking, {
      list: (items, shrink) =>
        h(ToggleList, {
          items,
          value: [],
          onChange: (value: readonly number[]) => {
            values.push([value, items.length]);
            shrink();
          },
        }),
    }),
  );
  pressAll(page, Key.End, Key.Enter, Key.Enter);
  assert.deepEqual(values, [
    [[2], 3],
    [[1], 2],
  ]);
});

test("collapsible sections that shrank under the chosen heading open only sections they have", () => {
  const values: [value: readonly number[], count: number][] = [];
  const page = viewer(
    h(Shrinking, {
      list: (titles, shrink) =>
        h(Collapsible, {
          titles,
          value: [],
          onChange: (value: readonly number[]) => {
            values.push([value, titles.length]);
            shrink();
          },
        }),
    }),
  );
  pressAll(page, Key.End, Key.Enter, Key.Enter);
  assert.deepEqual(values, [
    [[2], 3],
    [[1], 2],
  ]);
});

test("a toggle list or collapsible sections with nothing in them star or open nothing", () => {
  const values: (readonly number[])[] = [];
  const page = viewer(
    h(ToggleList, {
      items: [],
      autoFocus: true,
      onChange: (value: readonly number[]) => {
        values.push(value);
      },
    }),
    h(Collapsible, {
      titles: [],
      onChange: (value: readonly number[]) => {
        values.push(value);
      },
    }),
  );
  page.press(1, Key.Enter);
  page.press(1, Key.Tab);
  page.press(1, Key.Enter);
  assert.deepEqual(values, []);
});

test("a tree that shrank under its choice still takes the keys", () => {
  const chosen: [label: string, count: number][] = [];
  const page = viewer(
    h(Shrinking, {
      list: (labels, shrink) =>
        h(Tree, {
          nodes: labels.map((label) => ({ label })),
          shown: 5,
          onChoose: (node: TreeNode) => {
            chosen.push([node.label, labels.length]);
            shrink();
          },
        }),
    }),
  );
  pressAll(page, Key.End, Key.Enter, Key.Enter);
  assert.deepEqual(chosen, [
    ["three", 3],
    ["two", 2],
  ]);
});

test("a tree as deep as its data is drawn, however deep that is", () => {
  /** Deep enough that walking it by recursion overflows the stack. */
  const depth = 100_000;
  let node: TreeNode = { label: "bottom" };
  for (let level = 0; level < depth; level += 1) {
    node = { label: `level ${depth - level}`, children: [node] };
  }
  const page = viewer(h(Tree, { nodes: [node], shown: 5 }));
  assert.match(text(page.seen(1, PAGE).rows, BODY_ROW), /\+ level 1 /u);
});

test("a table column wider than the page allocates no more than the row it is drawn on", () => {
  /** Wider than the longest string the engine makes. */
  const width = 2 ** 30;
  const page = viewer(h(DataTable, { columns: [{ title: "Name", width }], rows: [["one"]], shown: 2 }));
  assert.match(text(page.seen(1, PAGE).rows, BODY_ROW + 1), /one/u);
});

test("a log entry of a level the log does not know, as a feed may send, is drawn as information", () => {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a program that takes its feed's levels on trust, as the test means
  const entries = JSON.parse('[{ "at": 0, "level": "fatal", "text": "from the feed" }]') as LogEntry[];
  const page = viewer(h(LogView, { entries, shown: 3 }));
  const white = String.fromCodePoint(Colour.White);
  assert.ok(text(page.seen(1, PAGE).rows, BODY_ROW).includes(`INF${white}from the feed`), "information's tag, then the text after its colour, white");
});

test("tabs with none to choose report no tab for Left or Right", () => {
  const changes: number[] = [];
  const page = viewer(
    h(TabView, {
      tabs: [],
      autoFocus: true,
      onChange: (index: number) => {
        changes.push(index);
      },
    }),
  );
  pressAll(page, Key.Right, Key.Left);
  assert.deepEqual(changes, []);
});
