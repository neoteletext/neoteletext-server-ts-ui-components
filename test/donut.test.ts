// Where a pie's colour changes along a row, its colour's cell goes where
// Hold Mosaics (EN 300 706 Table 26, 1/E), which shows the block before it
// there, gets fewer sixels wrong: a partial cell at a donut's hole keeps
// its own sixels rather than the full block before it.

import assert from "node:assert/strict";
import { test } from "node:test";

import { colourCell } from "../src/charts/pie-chart.ts";

const FULL = 0x7f;
const BLANK = 0x20;
/** Two of a cell's six sixels: its bottom row. */
const BOTTOM = 0x70;

test("between two full blocks the colour takes the cell before, which shows the full block it holds: nothing wrong", () => {
  assert.equal(colourCell([FULL, FULL, FULL], 2), 1);
});

test("a partial cell at a hole's edge, after a full block, keeps its own sixels: the colour takes the next cell, a blank one", () => {
  // Before: full; the partial cell; a blank of the hole where the colour starts. Held, the full block would fill the partial cell's four empty sixels; in the blank, the partial's two show, in the old colour.
  assert.equal(colourCell([FULL, BOTTOM, BLANK], 2), 2);
});
