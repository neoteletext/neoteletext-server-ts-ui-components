// The charts as a receiver shows them: a pie round on the screen and whole
// between its slices, columns whose labels are told apart, a bracket's
// headings in full, and series that keep their shape past a value that is
// no number, or a label given less than no cells. The graphics and games
// are in fixes-charts-games-more.test.ts.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Bracket, ColumnChart, h, Heatmap, PieChart, ScatterPlot, type Share, Sparkline } from "../src/index.ts";
import { Attribute, Colour, mosaicColour, textColour } from "../src/kit.ts";
import { BODY_ROW } from "./components-fixtures.ts";
import { codesOf, rowText, viewer } from "./charts-more-fixtures.ts";

/** A cell as the engine draws a page, 480 pixels by 500 for 40 cells by 25 rows, and as the browser shows it. */
const CELL_WIDTH_PIXELS = 480 / 40;
const CELL_HEIGHT_PIXELS = 500 / 25;
/** The base of a mosaic character, and the bit every character that can be held has (EN 300 706 clause 12.2, b6). */
const SPACE = 0x20;
const HOLDABLE = 0x20;
/** Capital letters in mosaics are shown as text, "blast-through", and are never held (Table 47). */
const BLAST_THROUGH = { first: 0x40, last: 0x5f } as const;

/** A cell as a receiver shows it with Hold Mosaics honoured: the mosaic shown, or null for a blank or text, in its colour. */
interface Held {
  readonly mosaic: number | null;
  readonly colour: number;
}

/**
 * Each cell of `codes` as a receiver shows it (EN 300 706 clause 12.2): a
 * colour attribute is set-after; Hold Mosaics is set-at, and while it holds
 * an attribute's cell in mosaics shows the last mosaic again, in the colour
 * before, the held character lost at a change between text and mosaics.
 */
function held(codes: readonly number[]): Held[] {
  let colour: number = Colour.White;
  let mosaics = false;
  let hold = false;
  let last = SPACE;
  return codes.map((code) => {
    if (code >= SPACE) {
      const isMosaic = mosaics && (code < BLAST_THROUGH.first || code > BLAST_THROUGH.last);
      if (isMosaic && (code & HOLDABLE) !== 0) {
        last = code;
      }
      return { mosaic: isMosaic && code !== SPACE ? code : null, colour };
    }
    if (code === Attribute.HoldMosaics) {
      hold = true;
    }
    const shows: Held = { mosaic: mosaics && hold && last !== SPACE ? last : null, colour };
    const text = code <= textColour(Colour.White);
    const mosaic = code >= mosaicColour(Colour.Black) && code <= mosaicColour(Colour.White);
    if (text || mosaic) {
      if (mosaics !== mosaic) {
        last = SPACE;
      }
      [colour, mosaics] = [code - (mosaic ? mosaicColour(Colour.Black) : textColour(Colour.Black)), mosaic];
    }
    if (code === Attribute.ReleaseMosaics) {
      hold = false;
    }
    return shows;
  });
}

const VOTES = [
  { label: "Labour", value: 33.7, foreground: Colour.Red },
  { label: "Conservative", value: 23.7, foreground: Colour.Blue },
  { label: "Reform", value: 14.3, foreground: Colour.Cyan },
  { label: "Lib Dem", value: 12.2, foreground: Colour.Yellow },
  { label: "Others", value: 16.1, foreground: Colour.White },
];
/** A pie's rows by default: a row of marks, seven of pie, a row of marks. */
const PIE_ROWS = 9;
/** Each row of a pie as shown: the legend beside it is text, so it shows no block. */
function pieRows(slices: readonly Share[], donut = false): Held[][] {
  const seen = viewer(h(PieChart, { slices, donut }));
  return Array.from({ length: PIE_ROWS }, (_, offset) => held(codesOf(seen, BODY_ROW + offset)));
}

/** The cells of `row` that show a block of `colour`, or of any colour. */
function blocks(row: readonly Held[], colour?: number): number[] {
  return row.flatMap((cell, column) =>
    cell.mosaic !== null && cell.colour !== Colour.Black && (colour === undefined || cell.colour === colour) ? [column] : [],
  );
}

test("a pie shows a block in every cell between its rims, with Hold Mosaics, so no seam or notch parts its slices", () => {
  const rows = pieRows(VOTES).slice(1, -1);
  rows.forEach((row, offset) => {
    const shown = blocks(row);
    const [first, last] = [shown[0] ?? 0, shown.at(-1) ?? 0];
    const gaps = Array.from({ length: last - first + 1 }, (_, index) => first + index).filter((column) => !shown.includes(column));
    assert.deepEqual(gaps, [], `row ${offset + 1} of the pie has no blank cell inside it`);
  });
});

test("a pie is round on the screen: as wide as it is tall in cells of 12 by 20 pixels, to within a cell", () => {
  const rows = pieRows(VOTES).slice(1, -1);
  const columns = rows.flatMap((row) => blocks(row));
  const across = (Math.max(...columns) - Math.min(...columns) + 1) * CELL_WIDTH_PIXELS;
  const down = rows.filter((row) => blocks(row).length > 0).length * CELL_HEIGHT_PIXELS;
  assert.ok(Math.abs(across - down) <= CELL_WIDTH_PIXELS, `${across} pixels across, ${down} down`);
});

test("a donut's hole stays a hole where the colour changes after it", () => {
  const slices = [
    { label: "Streaming", value: 61, foreground: Colour.Green },
    { label: "Broadcast", value: 27, foreground: Colour.Magenta },
    { label: "Radio", value: 12, foreground: Colour.Yellow },
  ];
  const middle = pieRows(slices, true)[Math.floor(PIE_ROWS / 2)] ?? [];
  const shown = blocks(middle);
  const gaps = Array.from({ length: (shown.at(-1) ?? 0) - (shown[0] ?? 0) }, (_, index) => (shown[0] ?? 0) + index).filter((column) => !shown.includes(column));
  assert.ok(gaps.length > 0, "the middle row has its hole");
});

test("a column chart's labels cut to its columns are told apart: each month whole, on two rows by turns", () => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug"];
  const seen = viewer(h(ColumnChart, { bars: months.map((label, index) => ({ label, value: index + 1 })), plotRows: 3 }));
  const labels = [BODY_ROW + 3, BODY_ROW + 4].map((row) => rowText(seen, row)).join("\n");
  for (const month of months) {
    assert.match(labels, new RegExp(`<white>${month}\\b`, "u"), `${month} in full`);
  }
});

test("a column chart whose labels fit its columns keeps them on one row", () => {
  const seen = viewer(h(ColumnChart, { bars: ["M", "T", "W"].map((label) => ({ label, value: 1 })), plotRows: 2 }));
  assert.match(rowText(seen, BODY_ROW + 2), /<white>M +<white>T +<white>W/u);
  assert.doesNotMatch(rowText(seen, BODY_ROW + 3), /[MTW]/u);
});

test("a bracket's round named longer than its column has its heading on two rows, broken after its hyphen", () => {
  const seen = viewer(
    h(Bracket, {
      rounds: [
        { name: "Quarter-finals", matches: [{ entrants: ["Arsenal", "Fulham"] }, { entrants: ["Chelsea", "Leeds"] }] },
        { name: "Final", matches: [{ entrants: ["Arsenal", "Leeds"] }] },
      ],
    }),
  );
  assert.match(rowText(seen, BODY_ROW), /^<cyan>Quarter- +<cyan>Final/u);
  assert.match(rowText(seen, BODY_ROW + 1), /^<cyan>finals/u);
  assert.match(rowText(seen, BODY_ROW + 2), /Arsenal/u, "the matches under the headings");
  assert.doesNotMatch(rowText(seen, BODY_ROW) + rowText(seen, BODY_ROW + 1), /\.\./u, "nothing cut");
});

test("a scatter plot leaves out a point that is no number, as a line chart does, and its axis stays a number", () => {
  const points: [number, number][] = [
    [1, 1],
    [2, 3],
    [Number.NaN, 2],
    [3, Number.POSITIVE_INFINITY],
  ];
  const seen = viewer(h(ScatterPlot, { points, plotRows: 3 }));
  const rows = [0, 1, 2].map((offset) => rowText(seen, BODY_ROW + offset)).join("\n");
  assert.doesNotMatch(rows, /NaN|Infinity/u);
  assert.match(rowText(seen, BODY_ROW), /^<cyan> +3/u, "the most is 3");
  assert.ok(
    [0, 1, 2].some((offset) => blocks(held(codesOf(seen, BODY_ROW + offset))).length > 0),
    "its points drawn",
  );
  assert.match(rowText(viewer(h(ScatterPlot, { points: [[Number.NaN, 1]], plotRows: 3 })), BODY_ROW), /no data/u);
});

test("a sparkline leaves out a value that is no number, and its last is the last that is one", () => {
  const seen = viewer(h(Sparkline, { label: "FTSE", values: [1, 2, Number.POSITIVE_INFINITY, 3, Number.NaN] }));
  const row = rowText(seen, BODY_ROW);
  assert.doesNotMatch(row, /NaN|Infinity/u);
  assert.match(row, /<cyan> +3$/u);
  assert.ok(blocks(held(codesOf(seen, BODY_ROW))).length > 0, "its line drawn");
  assert.match(rowText(viewer(h(Sparkline, { values: [Number.NaN] })), BODY_ROW), /no data/u);
});

/** A heat map's first row, its label given `labelCells`. */
function heat(labelCells: number): readonly number[] {
  return codesOf(viewer(h(Heatmap, { rows: [{ label: "Mon", values: [1, 2, 3] }], labelCells })), BODY_ROW);
}

/** A sparkline's row, its label given `labelCells`. */
function spark(labelCells: number): readonly number[] {
  return codesOf(viewer(h(Sparkline, { label: "FTSE", values: [1, 2, 3], labelCells })), BODY_ROW);
}

test("a heat map or a sparkline whose label is given less than no cells is drawn as one given none", () => {
  assert.deepEqual(heat(-5), heat(0));
  assert.deepEqual(spark(-5), spark(0));
  assert.deepEqual(spark(-(2 ** 32)), spark(0), "and one past an array's length");
});
