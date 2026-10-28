// How three components look on the page: a list picked by the coloured
// keys letters its rows in their keys' colours, a bar chart's bars stand
// apart, and large digits and letters keep clear of what is above them.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Bar, BarChart, BigDigits, BigText, ChoiceList, FULL_BLOCK, h, MOSAIC_BASE, SIXEL } from "../src/index.ts";
import { Attribute, Colour, mosaicColour, SIXELS_ACROSS, SIXELS_DOWN, textColour } from "../src/kit.ts";
import { codesOf, shown, viewer } from "./charts-more-fixtures.ts";
import { BODY_ROW } from "./components-fixtures.ts";

/** The coloured keys' letters, red to cyan, and the colours they are drawn in. */
const LETTERS = [
  ["R", Colour.Red],
  ["G", Colour.Green],
  ["Y", Colour.Yellow],
  ["C", Colour.Cyan],
] as const;

/** Items in small letters, so no capital among them is taken for a key's letter. */
const ITEMS = ["alpha", "bravo", "charlie", "delta", "echo"];

/** The columns of `codes` holding `character`. */
function columnsOf(codes: readonly number[], character: string): number[] {
  return codes.flatMap((code, column) => (code === character.codePointAt(0) ? [column] : []));
}

test("a list picked by the coloured keys draws each key's letter in its key's colour, the chosen row on its band, and every item's text in one column", () => {
  const seen = viewer(h(ChoiceList, { items: ITEMS, shown: ITEMS.length, pick: "colours", onChoose: () => {} }));
  const starts = ITEMS.map((item, row) => codesOf(seen, BODY_ROW + row).indexOf(item.codePointAt(0) ?? 0));
  LETTERS.forEach(([letter, colour], row) => {
    const codes = codesOf(seen, BODY_ROW + row);
    const [column] = columnsOf(codes, letter);
    assert.ok(column !== undefined, `row ${row} has its letter, ${letter}`);
    assert.equal(shown(codes)[column]?.colour, colour, `${letter} is drawn in its key's colour`);
    assert.ok(column < (starts[row] ?? 0), `${letter} comes before the item`);
  });
  const chosen = codesOf(seen, BODY_ROW);
  const band = chosen.indexOf(Attribute.NewBackground);
  assert.equal(chosen[band - 1], textColour(Colour.Yellow), "the chosen row's band is yellow");
  assert.ok(band < (starts[0] ?? 0), "the band is behind the chosen item");
  assert.equal(shown(chosen)[starts[0] ?? 0]?.colour, Colour.Blue, "the chosen item is in the band's ink");
  assert.equal(new Set(starts).size, 1, "every item's text starts in the same column, past the fourth too");
});

test("a disabled list picked by the coloured keys draws its letters dimmed, as the rest of it is", () => {
  const seen = viewer(h(ChoiceList, { items: ITEMS, shown: ITEMS.length, pick: "colours", disabled: true, onChoose: () => {} }));
  LETTERS.forEach(([letter], row) => {
    const codes = codesOf(seen, BODY_ROW + row);
    const [column] = columnsOf(codes, letter);
    assert.equal(column === undefined ? undefined : shown(codes)[column]?.colour, Colour.Blue, `${letter} is dimmed`);
  });
});

/** The bottom row of a cell's sixels. */
const BOTTOM_SIXELS = SIXEL.bottomLeft | SIXEL.bottomRight;

/** The mosaics a row shows after its first mosaic colour: the bar. */
function barCells(codes: readonly number[]): number[] {
  const at = codes.indexOf(mosaicColour(Colour.Green));
  return codes.slice(at + 1).filter((code) => code > MOSAIC_BASE && code <= FULL_BLOCK);
}

test("a bar chart's bars leave their cells' bottom sixels clear, so one bar stands apart from the next", () => {
  const seen = viewer(
    h(BarChart, {
      bars: [
        { label: "one", value: 10 },
        { label: "two", value: 7 },
      ],
    }),
  );
  for (const row of [0, 1]) {
    const cells = barCells(codesOf(seen, BODY_ROW + row));
    assert.ok(cells.length > 0, `bar ${row} is drawn`);
    assert.deepEqual(
      cells.filter((code) => (code & BOTTOM_SIXELS) !== 0),
      [],
      `bar ${row}'s cells are clear at the bottom`,
    );
  }
});

/** The most of a bar on its own in the tests, in steps of which its length goes to the half cell. */
const BAR_STEPS = 40;

test("a bar on its own leaves its bottom sixels clear, as a chart's bars do, its half cells too", () => {
  const bars = Array.from({ length: BAR_STEPS }, (_, value) => barCells(codesOf(viewer(h(Bar, { value: value + 1, max: BAR_STEPS })), BODY_ROW)));
  const shapes = new Set(bars.flat());
  assert.equal(shapes.size, 2, "a whole cell and a half one");
  assert.deepEqual(
    [...shapes].filter((code) => (code & BOTTOM_SIXELS) !== 0),
    [],
  );
});

/** The rows large text takes, of three sixels each. */
const LARGE_ROWS = 3;

/** Whether sixel `y` down of `codes`' cells is set anywhere across `rows`, read a cell's sixels at a time. */
function sixelRowSet(rows: readonly (readonly number[])[], y: number): boolean {
  const row = rows[Math.floor(y / SIXELS_DOWN)] ?? [];
  const bits =
    [
      [SIXEL.topLeft, SIXEL.topRight],
      [SIXEL.middleLeft, SIXEL.middleRight],
      [SIXEL.bottomLeft, SIXEL.bottomRight],
    ][y % SIXELS_DOWN] ?? [];
  assert.equal(bits.length, SIXELS_ACROSS);
  return row.some((code) => code > MOSAIC_BASE && code <= FULL_BLOCK && bits.some((bit) => (code & bit) !== 0));
}

for (const [name, component] of [
  ["large digits", BigDigits],
  ["large text", BigText],
] as const) {
  test(`${name} leave the top sixel row clear, so they stand apart from a band above, and draw all seven rows of a character`, () => {
    const seen = viewer(h(component, { text: "8" }));
    const rows = Array.from({ length: LARGE_ROWS }, (_, row) => codesOf(seen, BODY_ROW + row));
    const set = Array.from({ length: LARGE_ROWS * SIXELS_DOWN }, (_, y) => sixelRowSet(rows, y));
    assert.deepEqual(set, [false, true, true, true, true, true, true, true, false]);
  });
}
