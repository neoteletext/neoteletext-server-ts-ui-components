// A drop shadow: a dialog's (dialog.ts) raised look, a cell to its right
// and a row beneath it, two cells to the right (the elevations of
// core/look.ts). Teletext has no grey and a dialog sits on black, so the
// shadow is a stipple: separated mosaic blocks, whose dots read as the
// shade a terminal's shadow is drawn in. Each row spends two cells
// before it: a mosaic colour and Separated Graphics (EN 300 706 Table 26,
// both shown as spaces).

import type { Canvas } from "../core/canvas.ts";
import { FULL_BLOCK } from "../core/mosaics.ts";
import { Attribute, Colour, mosaicColour, SPACE } from "../kit.ts";

/** The stipple's colour: white dots, a grey to the eye. */
const SHADOW = Colour.White;
/** The cells it takes right of the dialog: the mosaic colour, Separated Graphics, and the stipple. */
export const SHADOW_MARGIN = 3;
/** The row it takes beneath the dialog. */
export const SHADOW_ROWS = 1;
/** How far right of the dialog's left edge the row beneath starts: the shadow falls down and to the right. */
const SHADOW_OFFSET = 2;
/** The codes before the stipple on a row. */
const LEAD = [mosaicColour(SHADOW), Attribute.Separated] as const;

/**
 * Paints the shadow of a dialog whose band runs from `left` to `right`
 * (its last cell) on rows 0 to `bodyRows` - 1: a stipple right of the band
 * from its second row down, and the row `bodyRows` beneath it.
 */
export function paintShadow(canvas: Canvas, left: number, right: number, bodyRows: number): void {
  const edge = right + SHADOW_MARGIN;
  for (let row = 1; row < bodyRows; row += 1) {
    canvas.codes(row, right + 1, [...LEAD, FULL_BLOCK]);
  }
  const from = left + SHADOW_OFFSET;
  canvas.codes(
    bodyRows,
    0,
    Array.from({ length: canvas.width }, () => SPACE),
  );
  canvas.codes(bodyRows, from - LEAD.length, LEAD);
  canvas.codes(
    bodyRows,
    from,
    Array.from({ length: Math.max(0, edge - from + 1) }, () => FULL_BLOCK),
  );
}
