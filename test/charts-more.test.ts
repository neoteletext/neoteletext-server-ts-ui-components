// The charts of parts of a whole and of sound as they draw: a breakdown
// bar, a pie and a donut, and a spectrum with the band levels it is drawn
// from. Places on a map and a bracket of rounds are in
// charts-more-places.test.ts.

import assert from "node:assert/strict";
import { test } from "node:test";

import { bandEdges, bandLevels, BreakdownBar, FULL_BLOCK, h, LEFT_HALF, MOSAIC_BASE, PieChart, RATE, Spectrum, tone } from "../src/index.ts";
import { Attribute, Colour, COLUMNS, englishCodes, mosaicColour, SIXELS_ACROSS, textColour } from "../src/kit.ts";
import { BODY_ROW } from "./components-fixtures.ts";
import { codesOf, readable, rowText, type Shown, shown, viewer } from "./charts-more-fixtures.ts";

const VOTES = [
  { label: "Labour", value: 412 },
  { label: "Conservative", value: 121 },
  { label: "Lib Dem", value: 72 },
  { label: "Reform", value: 5 },
  { label: "Green", value: 4 },
  { label: "Others", value: 1 },
];

/** A run of `cells` blocks. */
function run(cells: number): number[] {
  return Array.from({ length: cells }, () => FULL_BLOCK);
}

/** The column of `mark` in `codes`, or -1. */
function columnOf(codes: readonly number[], mark: string): number {
  return codes.indexOf(englishCodes(mark)[0] ?? -1);
}

test("a breakdown bar shares its cells by the largest remainder, each part's run in its colour, with Hold Mosaics so the runs meet", () => {
  const seen = viewer(h(BreakdownBar, { parts: VOTES }));
  // 38 cells after Hold Mosaics and the first colour's: quotas 25.46, 7.48 and 4.45, the two cells left to the largest fractions.
  assert.deepEqual(codesOf(seen, BODY_ROW), [
    Attribute.HoldMosaics,
    mosaicColour(Colour.Red),
    ...run(25),
    mosaicColour(Colour.Green),
    ...run(7),
    mosaicColour(Colour.Yellow),
    ...run(3),
    FULL_BLOCK,
  ]);
});

test("a breakdown bar marks each part under its run, so it is not told by colour alone, and its legend lists every part with its share", () => {
  const seen = viewer(h(BreakdownBar, { parts: VOTES }));
  const marks = codesOf(seen, BODY_ROW + 1);
  // Labour shows in cells 2 to 27, the Conservatives in 28 to 35, the Liberal Democrats in 36 to 39.
  assert.deepEqual(
    ["A", "B", "C"].map((mark) => columnOf(marks, mark)),
    [14, 31, 37],
  );
  assert.doesNotMatch(readable(marks), /[DEF]/u, "the parts with no cell have no mark on the bar");
  const legend = [BODY_ROW + 2, BODY_ROW + 3, BODY_ROW + 4].map((row) => rowText(seen, row)).join("\n");
  for (const [colour, mark, label, share] of [
    ["red", "A", "Labour", "67%"],
    ["green", "B", "Conservative", "20%"],
    ["yellow", "C", "Lib Dem", "12%"],
    ["cyan", "D", "Reform", "1%"],
    ["magenta", "E", "Green", "1%"],
    ["white", "F", "Others", "<1%"],
  ] as const) {
    assert.match(legend, new RegExp(`<${colour}>${mark}<white>${label} +${share}`, "u"), `${label}, too small for a cell or not, its mark in its colour`);
  }
});

test("a breakdown bar of nothing says so, and one given numbers that are not numbers draws within bounds", () => {
  assert.match(rowText(viewer(h(BreakdownBar, { parts: [{ label: "none", value: 0 }] })), BODY_ROW), /no data/u);
  const odd = viewer(
    h(BreakdownBar, {
      parts: [
        { label: "nan", value: Number.NaN },
        { label: "infinite", value: Number.POSITIVE_INFINITY },
        { label: "below", value: -3 },
        { label: "real", value: 2, mark: "real" },
      ],
      legendColumns: 1e9,
    }),
  );
  assert.deepEqual(codesOf(odd, BODY_ROW).slice(0, 3), [Attribute.HoldMosaics, mosaicColour(Colour.Cyan), FULL_BLOCK], "the one part counted takes the bar");
  // As many entries across as can be read, four of ten cells: a label of two characters before the share.
  assert.match(rowText(odd, BODY_ROW + 2), /<cyan>r<white>re +100%$/u, "marked by its own mark's first character");
  const tall = viewer(h(BreakdownBar, { parts: [{ label: "a", value: 1 }], barRows: 1e9 }));
  assert.ok(codesOf(tall, BODY_ROW).length <= COLUMNS, "a bar as tall as the box, and no taller");
});

/** The columns of `codes` showing sixels, by their colour. */
function columnsByColour(codes: readonly number[]): Map<number, number[]> {
  const byColour = new Map<number, number[]>();
  shown(codes).forEach((cell, column) => {
    if (cell.mosaic !== null) {
      byColour.set(cell.colour, [...(byColour.get(cell.colour) ?? []), column]);
    }
  });
  return byColour;
}

/** The rows a pie takes by default: a marks' row, seven of pie, a marks' row. */
const PIE_ROWS = 9;
/** The pie's middle row. */
const PIE_MIDDLE = BODY_ROW + 4;
/** The pie's middle column: three cells for the marks, and half of its nine. */
const PIE_CENTRE = 7;
/** The plot's cells, where the legend begins: the pie's nine and the marks' three either side. */
const PLOT_CELLS = 15;

test("a pie's slices run clockwise from twelve o'clock, each cell in the colour most of its sixels are", () => {
  const seen = viewer(
    h(PieChart, {
      slices: [
        { label: "first", value: 1 },
        { label: "second", value: 1 },
      ],
    }),
  );
  const byColour = columnsByColour(codesOf(seen, PIE_MIDDLE));
  const red = byColour.get(Colour.Red) ?? [];
  const green = byColour.get(Colour.Green) ?? [];
  assert.ok(red.length > 0 && red.every((column) => column >= PIE_CENTRE), `the first half on the right: ${red.join(" ")}`);
  assert.ok(green.length > 0 && green.every((column) => column < PIE_CENTRE), `the second on the left: ${green.join(" ")}`);
  for (let row = BODY_ROW + 1; row < BODY_ROW + PIE_ROWS - 1; row += 1) {
    assert.ok(
      [...columnsByColour(codesOf(seen, row)).keys()].every((colour) => colour === Colour.Red || colour === Colour.Green),
      `row ${row} in the two colours`,
    );
  }
});

test("a pie's slices are marked outside its rim, and its legend beside it names every slice, a slice too thin for a cell too", () => {
  const seen = viewer(
    h(PieChart, {
      slices: [
        { label: "most", value: 600 },
        { label: "rest", value: 399 },
        { label: "sliver", value: 1 },
      ],
    }),
  );
  const plots = Array.from({ length: PIE_ROWS }, (_, offset) => codesOf(seen, BODY_ROW + offset).slice(0, PLOT_CELLS));
  const markAt = (mark: string): number => plots.map((codes) => columnOf(codes, mark)).find((column) => column >= 0) ?? -1;
  // The first slice's middle is at 108 degrees, right and a little down; the second's at 288, left and a little up.
  assert.ok(markAt("A") > PIE_CENTRE, "A on the right");
  assert.ok(markAt("B") >= 0 && markAt("B") < PIE_CENTRE, "B on the left");
  assert.equal(markAt("C"), -1, "the sliver won no cell, so it has no mark on the pie");
  const legend = Array.from({ length: PIE_ROWS }, (_, offset) => readable(codesOf(seen, BODY_ROW + offset).slice(PLOT_CELLS))).join("\n");
  assert.match(legend, /A<white>most +60%/u);
  assert.match(legend, /B<white>rest +40%/u);
  assert.match(legend, /C<white>sliver +<1%/u);
});

test("a donut has a hole where a pie has its middle", () => {
  const slices = [{ label: "whole", value: 1 }];
  const middleOf = (donut: boolean): Shown | undefined => shown(codesOf(viewer(h(PieChart, { slices, donut })), PIE_MIDDLE))[PIE_CENTRE];
  assert.notEqual(middleOf(false)?.mosaic ?? null, null, "a pie is solid");
  assert.equal(middleOf(true)?.mosaic ?? null, null, "a donut is not");
});

test("a pie of nothing, or with too few rows to draw, says so", () => {
  assert.match(rowText(viewer(h(PieChart, { slices: [] })), BODY_ROW), /no data/u);
  assert.match(rowText(viewer(h(PieChart, { slices: [{ label: "a", value: 1 }], plotRows: 2 })), BODY_ROW), /no data/u);
  assert.ok(codesOf(viewer(h(PieChart, { slices: [{ label: "a", value: 1 }], plotRows: 1e9 })), BODY_ROW).length <= COLUMNS);
});

test("a spectrum's columns rise to each band's level, a sixel apart, in a meter's colours by row", () => {
  const seen = viewer(h(Spectrum, { levels: [0, 0.5, 1, Number.NaN, 2, -1], plotRows: 2 }));
  const top = codesOf(seen, BODY_ROW);
  const foot = codesOf(seen, BODY_ROW + 1);
  // Six sixels high: nothing, three, six, nothing for NaN, six for a level past one, nothing below nought.
  assert.deepEqual(top.slice(0, 7), [mosaicColour(Colour.Yellow), MOSAIC_BASE, MOSAIC_BASE, LEFT_HALF, MOSAIC_BASE, LEFT_HALF, MOSAIC_BASE]);
  assert.deepEqual(foot.slice(0, 7), [mosaicColour(Colour.Green), MOSAIC_BASE, LEFT_HALF, LEFT_HALF, MOSAIC_BASE, LEFT_HALF, MOSAIC_BASE]);
  const one = viewer(h(Spectrum, { levels: [1], plotRows: 2, foreground: Colour.Cyan, bandCells: 2 }));
  assert.deepEqual(codesOf(one, BODY_ROW).slice(0, 3), [mosaicColour(Colour.Cyan), FULL_BLOCK, LEFT_HALF], "a band two cells wide, less its gap");
  assert.match(rowText(viewer(h(Spectrum, { levels: [] })), BODY_ROW), /no sound/u);
});

test("a tone's band levels peak in the band its frequency is in, wherever it is in the band", () => {
  const bands = 16;
  const edges = bandEdges(RATE, bands);
  assert.equal(edges.length, bands + 1);
  assert.equal(edges.at(-1), RATE / 2, "up to the Nyquist frequency");
  /** How far into a band, by pitch, a tone must be to be tested: right on an edge, both bands read it alike. */
  const margin = 0.05;
  /** The step between the frequencies tried, a ratio: some 80 tones across the bands. */
  const step = 1.07;
  /** A tone's length: long enough for the lowest bands' longest run. */
  const milliseconds = 500;
  let tried = 0;
  for (let frequency = (edges[0] ?? 0) * step; frequency < RATE / 2; frequency *= step) {
    const band = edges.findIndex((edge, index) => frequency >= edge && frequency < (edges[index + 1] ?? 0));
    const low = edges[band] ?? 0;
    const into = Math.log(frequency / low) / Math.log((edges[band + 1] ?? 0) / low);
    if (into < margin || into > 1 - margin) {
      continue;
    }
    const samples = tone(frequency, milliseconds);
    const levels = bandLevels(samples, RATE, samples.length / 2, bands);
    const peak = levels.indexOf(Math.max(...levels));
    assert.equal(peak, band, `${frequency.toFixed(0)} Hz is in band ${band}: ${levels.map((level) => level.toFixed(2)).join(" ")}`);
    assert.ok((levels[peak] ?? 0) > 0.5, "a tone of a quarter of full scale reads well up the scale");
    tried += 1;
  }
  assert.ok(tried > 50, `${tried} tones tried`);
});

test("band levels are nought for silence or no samples, bounded for short sounds, and none for a rate or count that is not a number", () => {
  assert.deepEqual(bandLevels(new Int16Array(0), RATE, 0, 4), [0, 0, 0, 0]);
  assert.deepEqual(bandLevels(new Int16Array(4_000), RATE, 2_000, 3), [0, 0, 0]);
  const short = bandLevels(tone(1_000, 1), RATE, Number.NaN, 8);
  assert.equal(short.length, 8);
  assert.ok(short.every((level) => level >= 0 && level <= 1));
  assert.deepEqual(bandLevels(tone(1_000, 10), Number.NaN, 0, 8), []);
  assert.deepEqual(bandLevels(tone(1_000, 10), -RATE, 0, 8), []);
  assert.deepEqual(bandLevels(tone(1_000, 10), RATE, 0, Number.NaN), []);
  assert.equal(bandLevels(tone(1_000, 10), RATE, 1e12, 1e9).length, COLUMNS * SIXELS_ACROSS, "no more bands than columns of sixels across a page");
});

test("a part's mark in a pie's legend is in its colour", () => {
  const seen = viewer(h(PieChart, { slices: [{ label: "only", value: 1, foreground: Colour.Magenta, mark: "#" }] }));
  assert.deepEqual(codesOf(seen, BODY_ROW).slice(PLOT_CELLS, PLOT_CELLS + 3), [textColour(Colour.Magenta), ...englishCodes("#"), textColour(Colour.White)]);
});
