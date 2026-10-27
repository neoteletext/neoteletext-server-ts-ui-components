// Live lists: an item arriving above the chosen one leaves the choice on
// its item, in a list, a table and a menu, when each is told its items'
// keys.

import assert from "node:assert/strict";
import { test } from "node:test";

import { type Child, ChoiceList, Component, DataTable, h, type KeyEvent, Menu } from "../src/index.ts";
import { Key } from "../src/kit.ts";
import { viewer } from "./controls-fixtures.ts";

const before = ["bravo", "charlie"];
const after = ["alpha", "bravo", "charlie"];

/** Shows `make`'s control over the items before, then after "n" is pressed. */
class Live extends Component<{ readonly make: (items: readonly string[]) => Child }, { readonly items: readonly string[] }> {
  override state = { items: before };

  override onKey(event: KeyEvent): boolean {
    if (event.key === "n" && event.action === "press") {
      this.setState({ items: after });
      return true;
    }
    return false;
  }

  override render(): Child {
    return this.props.make(this.state.items);
  }
}

/** Moves down to "charlie", adds "alpha" above, and chooses. */
function chooseAfterArrival(make: (items: readonly string[]) => Child): void {
  const page = viewer(h(Live, { make }));
  page.press(1, Key.Down);
  page.press(1, "n");
  page.press(1, Key.Enter);
}

test("a list told its items' keys keeps the chosen item chosen as one arrives above it", () => {
  const chosen: string[] = [];
  chooseAfterArrival((items) =>
    h(ChoiceList, {
      items,
      shown: 4,
      itemKey: String,
      onChoose: (index: number) => {
        chosen.push(items[index] ?? "");
      },
    }),
  );
  assert.deepEqual(chosen, ["charlie"]);
});

test("a table told its rows' keys keeps the chosen row chosen as one arrives above it", () => {
  const chosen: string[] = [];
  chooseAfterArrival((items) =>
    h(DataTable, {
      columns: [{ title: "Name", width: 12 }],
      rows: items.map((item) => [item]),
      shown: 4,
      selectable: true,
      rowKey: (row: readonly string[]) => row[0] ?? "",
      onChoose: (row: readonly string[]) => {
        chosen.push(row[0] ?? "");
      },
    }),
  );
  assert.deepEqual(chosen, ["charlie"]);
});

test("a menu told its choices' keys keeps the chosen one chosen as one arrives above it", () => {
  const chosen: string[] = [];
  chooseAfterArrival((items) =>
    h(Menu, {
      items: items.map((label) => ({ label })),
      itemKey: (item: { readonly label: string }) => item.label,
      onChoose: (path: readonly string[]) => {
        chosen.push(path.join("/"));
      },
    }),
  );
  assert.deepEqual(chosen, ["charlie"]);
});

test("without keys the choice keeps its place, as before", () => {
  const chosen: string[] = [];
  chooseAfterArrival((items) =>
    h(ChoiceList, {
      items,
      shown: 4,
      onChoose: (index: number) => {
        chosen.push(items[index] ?? "");
      },
    }),
  );
  assert.deepEqual(chosen, ["bravo"]);
});
