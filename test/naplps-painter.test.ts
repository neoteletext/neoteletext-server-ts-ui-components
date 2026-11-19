// REQ-6774, renderer parity PAR-42, TODO-6840: a NAPLPS fill written at
// three-byte precision lands up to half a step from a cell's edge (ANSI
// X3.110-1983 section 5.3.2.2.3, Table 5), so where what lies past the edge
// hides what a fill reaches into (the object's exact rectangle, ANIM-11 and
// DEC-6829, or an object composed over the drawing) the painter grows the
// fill there by a whole step, and nowhere else.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Naplps, naplpsLimits } from "../src/kit.ts";
import { NAPLPS_COLUMN, naplpsX, naplpsY } from "../src/picture/grid.ts";
import { cellsBox, type DesignBox, NaplpsPainter, OVERFILL_ACROSS, OVERFILL_DOWN, overfilled } from "../src/picture/naplps-painter.ts";

/** The operand's steps in a unit of the unit screen at three-byte precision: nine bits an axis, the top one the sign. */
const UNIT_STEPS = 256;

/** A builder that keeps the rectangles the painter writes. */
class Recorder extends Naplps {
  readonly rects: DesignBox[] = [];

  override rect(x: number, y: number, width: number, height: number, options: { filled?: boolean } = {}): this {
    this.rects.push({ x, y, width, height });
    return super.rect(x, y, width, height, options);
  }
}

/** The cells of row 4 from column 5 to 9 are an object's. */
function rowFourObject(row: number, column: number): boolean {
  return row === 4 && column >= 5 && column < 10;
}

/** No cell is drawn over. */
function nothingOver(): boolean {
  return false;
}

test("a step of the operand's precision is no wider than the overfill, across and down", () => {
  assert.ok(OVERFILL_ACROSS >= naplpsLimits.OBJECT_PICTURE_WIDTH / UNIT_STEPS);
  const displayed = (UNIT_STEPS * naplpsLimits.DISPLAY_HEIGHT_NUMERATOR) / naplpsLimits.DISPLAY_HEIGHT_DENOMINATOR;
  assert.ok(OVERFILL_DOWN >= naplpsLimits.OBJECT_PICTURE_HEIGHT / displayed);
});

test("an object's fill is grown at the edges it shares with the object's rectangle, within the design picture, and not inside it", () => {
  const clip = cellsBox(3, 0, 40, 2);
  assert.deepEqual(overfilled(cellsBox(3, 0, 10, 1), clip), {
    x: 0,
    y: naplpsY(3) - OVERFILL_DOWN,
    width: 10 * NAPLPS_COLUMN,
    height: naplpsY(4) - naplpsY(3) + OVERFILL_DOWN,
  });
  assert.deepEqual(overfilled(cellsBox(4, 10, 30, 1), clip), {
    x: naplpsX(10),
    y: naplpsY(4),
    width: naplpsLimits.OBJECT_PICTURE_WIDTH - naplpsX(10),
    height: naplpsY(5) + OVERFILL_DOWN - naplpsY(4),
  });
});

test("a stream fill is grown into an object's cells and split where the cells beside it change", () => {
  const builder = new Recorder();
  new NaplpsPainter(builder, { clip: null, drawnOver: rowFourObject }).fill(3, 0, 20, 1, 1);
  assert.deepEqual(builder.rects, [cellsBox(3, 0, 5, 1), { ...cellsBox(3, 5, 5, 1), height: naplpsY(4) + OVERFILL_DOWN - naplpsY(3) }, cellsBox(3, 10, 10, 1)]);
});

test("a fill with nothing beside it that hides what it reaches into is written at its cells", () => {
  const builder = new Recorder();
  new NaplpsPainter(builder, { clip: null, drawnOver: nothingOver }).fill(3, 2, 6, 1, 1);
  new NaplpsPainter(builder).fill(5, 2, 6, 1, 1);
  assert.deepEqual(builder.rects, [cellsBox(3, 2, 6, 1), cellsBox(5, 2, 6, 1)]);
});
