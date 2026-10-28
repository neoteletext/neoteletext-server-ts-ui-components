// A drop shadow: a dialog's (dialog.ts) raised look, a strip to its right
// and a row beneath it, two cells to the right (the elevations of
// core/look.ts). Teletext has no grey and a dialog sits on black, so the
// shadow is a stipple: mosaic cells of alternate sixels, whose checker
// reads as the shade a terminal's shadow is drawn in. Its mosaic colour
// takes the dialog's last cell, which shows as the dialog's background
// (a colour is set after its cell, EN 300 706 Table 26), so the only gap
// between the dialog and its shadow is the cell that ends the dialog's
// background, which teletext always shows as a space.

import type { Canvas } from "../core/canvas.ts";
import { MOSAIC_BASE, SIXEL } from "../core/mosaics.ts";
import { Colour, mosaicColour, SPACE } from "../kit.ts";

/** The stipple's colour: white dots, a grey to the eye. */
const SHADOW = Colour.White;
/** A checker of sixels: left, right, left down the cell, so cells side by side make one checker. */
const STIPPLE = MOSAIC_BASE | SIXEL.topLeft | SIXEL.middleRight | SIXEL.bottomLeft;
/** The cells it takes right of the dialog's end: the stipple. */
export const SHADOW_MARGIN = 1;
/** The cell of the dialog's own it takes: its last, for the mosaic colour. */
export const SHADOW_INSIDE = 1;
/** The row it takes beneath the dialog. */
export const SHADOW_ROWS = 1;
/** How far right of the dialog's left edge the row beneath starts: the shadow falls down and to the right. */
const SHADOW_OFFSET = 2;

/**
 * Paints the shadow of a dialog whose background runs from `left` to
 * `right`, the cell that ends it, on rows 0 to `bodyRows` - 1: a stipple
 * right of it from its second row down, and the row `bodyRows` beneath it.
 */
export function paintShadow(canvas: Canvas, left: number, right: number, bodyRows: number): void {
  for (let row = 1; row < bodyRows; row += 1) {
    canvas.code(row, right - SHADOW_INSIDE, mosaicColour(SHADOW));
    canvas.code(row, right + 1, STIPPLE);
  }
  const from = left + SHADOW_OFFSET;
  canvas.codes(
    bodyRows,
    0,
    Array.from({ length: canvas.width }, () => SPACE),
  );
  canvas.code(bodyRows, from - 1, mosaicColour(SHADOW));
  canvas.codes(
    bodyRows,
    from,
    Array.from({ length: Math.max(0, right + SHADOW_MARGIN - from + 1) }, () => STIPPLE),
  );
}
