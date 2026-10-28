// The hint row keeps whole entries only of what the keys do: what a row
// is, under the pointer, is cut as any text is.

import assert from "node:assert/strict";
import { test } from "node:test";

import { text } from "neoteletext-server-ts-protocol/testing";
import { ChoiceList, h } from "../src/index.ts";
import { controlsOf, inOrder, PAGE, viewer } from "./controls-fixtures.ts";

/** Longer than the hint row's 39 cells, in parts a comma apart, as a story's description is. */
const DESCRIPTION = "By Tom Hallett, 100 words: how the mosaics were drawn by hand";

test("what a hovered row is, too long for the hint row, is cut there, not dropped after its first comma", () => {
  const page = viewer(h(ChoiceList, { items: ["one", "two"], shown: 2, onChoose: () => {}, itemHint: (_item, index) => (index === 1 ? DESCRIPTION : null) }));
  const two = inOrder(controlsOf(page, PAGE)).find((control) => control.row > 0 && text(page.seen(1, PAGE).rows, control.row).includes("two"));
  assert.ok(two !== undefined, "the second row is a control");
  page.hover(1, "enter", two.column, two.row);
  const hint = text(page.seen(1, PAGE).rows, 23);
  assert.match(hint, /By Tom Hallett, 100 words: how the/u, "as much of the words as fits");
  assert.match(hint, /\.\.\s*$/u, "cut with the cut mark");
});
