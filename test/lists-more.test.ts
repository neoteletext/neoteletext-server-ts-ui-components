// Lists picked by a key, lists narrowed by typing, and pages found by name.

import assert from "node:assert/strict";
import { test } from "node:test";

import { text } from "neottx-server-ts-protocol/testing";
import { ChoiceList, type Element, FilterList, h, matchRank, PageFinder } from "../src/index.ts";
import { Key } from "../src/kit.ts";
import { BODY_ROW, frame, harness, PAGE } from "./components-fixtures.ts";
import { rowText } from "./charts-more-fixtures.ts";
import { viewer } from "./controls-fixtures.ts";

const names = ["alpha", "bravo", "charlie", "delta"];

test("a list picked by digits numbers its rows, and a digit chooses one, not page selection", () => {
  const chosen: number[] = [];
  const page = viewer(
    h(ChoiceList, {
      items: names,
      shown: 4,
      pick: "digits",
      onChoose: (index: number) => {
        chosen.push(index);
      },
    }),
  );
  assert.match(text(page.seen(1, PAGE).rows, BODY_ROW + 2), /3 charlie/u);
  page.press(1, "3");
  assert.deepEqual(chosen, [2]);
});

test("a list picked by the coloured keys letters its first four rows, and a coloured key chooses one", () => {
  const chosen: number[] = [];
  const page = viewer(
    h(ChoiceList, {
      items: names,
      shown: 4,
      pick: "colours",
      onChoose: (index: number) => {
        chosen.push(index);
      },
    }),
  );
  assert.match(rowText(page, BODY_ROW + 1), /<green>G {2}<white>bravo/u, "the letter in its key's colour, in its column before the band");
  page.press(1, Key.Yellow);
  assert.deepEqual(chosen, [2]);
});

test("matching ranks a start over a run over letters in order", () => {
  assert.equal(matchRank("Weather", "wea"), 0);
  assert.equal(matchRank("The weather", "wea"), 1);
  assert.equal(matchRank("World news", "wns"), 2);
  assert.equal(matchRank("Sport", "xyz"), null);
});

test("a filter list narrows as the viewer types, Backspace widens it, and a choice says its place among all the items", () => {
  const chosen: number[] = [];
  const page = viewer(
    h(FilterList<string>, {
      items: names,
      text: (name: string) => name,
      shown: 4,
      autoFocus: true,
      onChoose: (index: number) => {
        chosen.push(index);
      },
    }),
  );
  page.typeKeys(1, "lt");
  const rows = page.seen(1, PAGE).rows;
  assert.match(text(rows, BODY_ROW), /Find: lt/u);
  assert.match(text(rows, BODY_ROW + 1), /delta/u, "only delta holds l then t");
  page.press(1, Key.Enter);
  assert.deepEqual(chosen, [3]);
  page.press(1, Key.Backspace);
  assert.match(text(page.seen(1, PAGE).rows, BODY_ROW + 1), /alpha/u, "l alone matches more");
});

test("a page finder goes to the page found by its name", () => {
  const pages = [
    { page: 0x100, title: "Index" },
    { page: 0x302, title: "Football" },
    { page: 0x401, title: "Weather" },
  ];
  const seen = harness([
    { page: PAGE, title: "Find", perViewer: true, root: (): Element => frame("Find", h(PageFinder, { pages, shown: 3, autoFocus: true })) },
    { page: 0x401, title: "Weather", root: (): Element => frame("Weather") },
  ]);
  seen.join(1, PAGE);
  seen.typeKeys(1, "wea");
  seen.press(1, Key.Enter);
  assert.deepEqual(seen.gotos(1), [0x401]);
});
