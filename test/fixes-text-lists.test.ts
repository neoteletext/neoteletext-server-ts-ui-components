// What a list's rows, a tree and a tab strip draw: rows that keep their
// leading spaces, a tree whose guides join each item to its parent's mark
// in thin lines, a tree item with no children chosen as a leaf, and a
// strip that stops at the first tab that does not fit. Double width is
// enhancement.test.ts's.

import assert from "node:assert/strict";
import { test } from "node:test";

import { text } from "neoteletext-server-ts-protocol/testing";
import { h, TabStrip, ToggleList, Tree, type TreeNode } from "../src/index.ts";
import { SIXEL } from "../src/core/mosaics.ts";
import { Attribute, Colour, Key, mosaicColour } from "../src/kit.ts";
import { BODY_ROW, PAGE, viewer } from "./controls-fixtures.ts";

/** Where a row's mark is before its label: the mark, then a space. */
const MARK_BEFORE_LABEL = 2;

/** The body's rows as the viewer sees them, codes and text. */
function seen(...body: Parameters<typeof viewer>): { readonly codes: readonly (readonly number[])[]; readonly lines: readonly string[] } {
  const page = viewer(...body);
  assert.deepEqual(page.errors, [], "the channel reported no failure");
  const { rows } = page.seen(1, PAGE);
  return { codes: rows, lines: rows.map((_, row) => text(rows, row)) };
}

/** The body row whose text holds `label` as a word, and the column it starts in. */
function labelAt(lines: readonly string[], label: string): { readonly row: number; readonly column: number } {
  const pattern = new RegExp(`(?<![A-Za-z])${label}(?![A-Za-z])`, "u");
  const row = lines.findIndex((line, index) => index >= BODY_ROW && pattern.test(line));
  assert.ok(row >= 0, `"${label}" is drawn`);
  return { row, column: lines[row]?.search(pattern) ?? -1 };
}

test("a tree's leaf starts its label where its siblings with children start theirs", () => {
  const { lines } = seen(
    h(Tree, {
      shown: 4,
      nodes: [{ label: "News", children: [{ label: "UK" }] }, { label: "Weather" }],
    }),
  );
  assert.equal(labelAt(lines, "Weather").column, labelAt(lines, "News").column);
});

test("a toggle list's unstarred item starts its label where a starred one does", () => {
  const { lines } = seen(h(ToggleList, { items: ["Alpha", "Beta"], initial: [0] }));
  assert.equal(labelAt(lines, "Beta").column, labelAt(lines, "Alpha").column);
});

/** The opened tree with guides the catalogue shows. */
const GUIDED: readonly TreeNode[] = [
  { label: "News", children: [{ label: "UK" }, { label: "World" }] },
  { label: "Sport", children: [{ label: "Football", children: [{ label: "Results" }, { label: "Tables" }] }, { label: "Cricket" }] },
  { label: "Weather" },
];

/** Each item's parent, by label; null at the top. */
const PARENTS: Readonly<Record<string, string | null>> = {
  News: null,
  UK: "News",
  World: "News",
  Sport: null,
  Football: "Sport",
  Results: "Football",
  Tables: "Football",
  Cricket: "Sport",
  Weather: null,
};

/** Whether the mosaic `code` has every sixel of `sixels`. */
function has(code: number | undefined, ...sixels: number[]): boolean {
  return code !== undefined && sixels.every((sixel) => (code & sixel) === sixel);
}

test("a tree's guides join each item to its parent's mark, the top items to each other, in thin lines", () => {
  const { codes, lines } = seen(h(Tree, { shown: 10, guides: true, open: ["News", "Sport", "Football"], nodes: GUIDED }));
  const top = labelAt(lines, "News");
  for (const [label, parent] of Object.entries(PARENTS)) {
    const item = labelAt(lines, label);
    const row = codes[item.row] ?? [];
    const colour = row.indexOf(mosaicColour(Colour.Blue));
    assert.ok(colour >= 0 && colour < item.column, `${label}: its guides are drawn before it, the top items' too`);
    assert.equal(row[colour + 1], Attribute.Separated, `${label}: in separated mosaics, which draw a sixel as a thin line`);
    if (parent === null) {
      continue;
    }
    const above = labelAt(lines, parent);
    const markColumn = above.column - MARK_BEFORE_LABEL;
    assert.ok(
      has(row[markColumn], SIXEL.topLeft, SIXEL.middleLeft, SIXEL.middleRight),
      `${label}: a branch under ${parent}'s mark, up to it and across to the item`,
    );
    for (let between = above.row + 1; between < item.row; between += 1) {
      assert.ok(has(codes[between]?.[markColumn], SIXEL.topLeft, SIXEL.middleLeft), `${label}: the line from ${parent}'s mark goes on down row ${between}`);
    }
  }
  const topColumn = (codes[top.row] ?? []).findIndex((code, column) => column > 0 && has(code, SIXEL.middleLeft, SIXEL.middleRight));
  const weather = labelAt(lines, "Weather");
  for (let row = top.row + 1; row < weather.row; row += 1) {
    assert.ok(has(codes[row]?.[topColumn], SIXEL.middleLeft), `the line joining the top items goes on down row ${row}`);
  }
});

test("a tree item with no children is a leaf: no mark to open, and Enter chooses it", () => {
  const chosen: string[] = [];
  const page = viewer(
    h(Tree, {
      shown: 4,
      nodes: [{ label: "Empty", children: [] }],
      onChoose: (node: TreeNode) => {
        chosen.push(node.label);
      },
    }),
  );
  const { rows } = page.seen(1, PAGE);
  assert.doesNotMatch(text(rows, BODY_ROW), /[+-] Empty/u, "no mark to open it");
  page.press(1, Key.Enter);
  assert.deepEqual(chosen, ["Empty"]);
});

test("a tab strip stops at the first tab that does not fit, drawing no later one in its place", () => {
  const { lines } = seen(h(TabStrip, { tabs: ["One", "A name far longer than the strip is wide", "Two"], active: 0, onChange: () => {} }));
  assert.match(lines[BODY_ROW] ?? "", /One/u);
  assert.doesNotMatch(lines[BODY_ROW] ?? "", /Two/u, "the tab after the one that does not fit is not drawn");
});
