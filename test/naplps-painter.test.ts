// REQ-6774, renderer parity PAR-42, DEC-6849: the kit writes NAPLPS
// coordinates at four-byte precision (ANSI X3.110-1983 section 5.3.2.2.3,
// Table 5), and a filled rectangle covers from the pixel its near corner
// rounds to through the pixel its far corner rounds to (sections 5.3.3.4.1
// and 5.3.2.2.6), so the painter writes each fill from the centre of its
// cells' first raster pixel to the centre of their last, and reaches no
// cell beyond them. test/picture-naplps-cells.test.ts reads what the
// server's renderer then draws.

import assert from "node:assert/strict";
import { test } from "node:test";

import { Naplps } from "../src/kit.ts";
import { naplpsDotCentre, naplpsLineCentre } from "../src/picture/grid.ts";
import { type DesignBox, NaplpsPainter } from "../src/picture/naplps-painter.ts";

/** A builder that keeps the rectangles the painter writes. */
class Recorder extends Naplps {
  readonly rects: DesignBox[] = [];

  override rect(x: number, y: number, width: number, height: number, options: { filled?: boolean } = {}): this {
    this.rects.push({ x, y, width, height });
    return super.rect(x, y, width, height, options);
  }
}

/** The rectangle from the centre of dot `firstDot` and raster line `firstLine` to the centre of dot `lastDot` and line `lastLine`. */
function centres(firstDot: number, lastDot: number, firstLine: number, lastLine: number): DesignBox {
  const [x, y] = [naplpsDotCentre(firstDot), naplpsLineCentre(firstLine)];
  return { x, y, width: naplpsDotCentre(lastDot) - x, height: naplpsLineCentre(lastLine) - y };
}

test("a fill is written from its cells' first raster pixel's centre to their last's, the raster's last dot included", () => {
  const builder = new Recorder();
  const painter = new NaplpsPainter(builder);
  // Row 3 is raster lines 60 to 79; columns 0 to 39 are dots 0 to 479.
  painter.fill(3, 0, 40, 1, 1);
  // Rows 5 and 6, columns 10 to 12: lines 100 to 139, dots 120 to 155.
  painter.fill(5, 10, 3, 2, 2);
  assert.deepEqual(builder.rects, [centres(0, 479, 60, 79), centres(120, 155, 100, 139)]);
});

test("a sixel covers its own dots and lines, a separated one leaving its right 2 dots and bottom 2 lines out", () => {
  const builder = new Recorder();
  const painter = new NaplpsPainter(builder);
  // Row 2, column 4 is dots 48 to 59 and lines 40 to 59; its sixel rows are 7, 7 and 6 lines.
  painter.sixel(2, 4, 1, 1, false, 3);
  painter.sixel(2, 4, 0, 2, true, 3);
  assert.deepEqual(builder.rects, [centres(54, 59, 47, 53), centres(48, 51, 54, 57)]);
});

test("the centres lie within the design picture at both ends of the raster's display area", () => {
  assert.equal(naplpsDotCentre(0), 0);
  assert.ok(naplpsDotCentre(479) < 640);
  // Raster line 19, the display area's first, has its centre a line below the design picture's top; line 480, its
  // last, on the picture's foot.
  assert.equal(naplpsLineCentre(480), 480);
  assert.ok(naplpsLineCentre(19) > 0);
});
