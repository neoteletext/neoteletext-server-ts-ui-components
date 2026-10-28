// Mosaic characters the components draw with (EN 300 706 Table 47): bit 5
// is always set; the sixels are bits 0 and 1 (top left, top right), 2 and 3
// (middle), 4 and 6 (bottom). A cell's shape is here too, since what is
// drawn round in mosaics is round only on the cell's shape.

import { COLUMNS, ROWS } from "../kit.ts";

/** The base of every mosaic character. */
export const MOSAIC_BASE = 0x20;
/** Each sixel's bit, left then right, top to bottom. */
export const SIXEL = { topLeft: 0x01, topRight: 0x02, middleLeft: 0x04, middleRight: 0x08, bottomLeft: 0x10, bottomRight: 0x40 } as const;
/** Every sixel set. */
export const FULL_BLOCK = MOSAIC_BASE | SIXEL.topLeft | SIXEL.topRight | SIXEL.middleLeft | SIXEL.middleRight | SIXEL.bottomLeft | SIXEL.bottomRight;
/** The left column of sixels: half a cell, or a thin line down. */
export const LEFT_HALF = MOSAIC_BASE | SIXEL.topLeft | SIXEL.middleLeft | SIXEL.bottomLeft;
/** The right column of sixels. */
export const RIGHT_HALF = MOSAIC_BASE | SIXEL.topRight | SIXEL.middleRight | SIXEL.bottomRight;
/** The top row of sixels. */
export const TOP_ROW = MOSAIC_BASE | SIXEL.topLeft | SIXEL.topRight;
/** The middle row of sixels: a thin line across. */
export const MIDDLE_ROW = MOSAIC_BASE | SIXEL.middleLeft | SIXEL.middleRight;
/** The bottom row of sixels. */
export const BOTTOM_ROW = MOSAIC_BASE | SIXEL.bottomLeft | SIXEL.bottomRight;
/** The top two rows: an upper block. */
export const UPPER_TWO = TOP_ROW | MIDDLE_ROW;
/** The bottom two rows: a lower block. */
export const LOWER_TWO = MIDDLE_ROW | BOTTOM_ROW;

/** The picture the engine draws a page as, in pixels, which the browser shows as it is drawn. */
const PAGE_PIXELS = { across: 480, down: 500 } as const;

/**
 * A cell's width over its height as a page is seen: a fortieth of the
 * picture across by a twenty-fifth down, 12 pixels by 20. What is to be
 * round, a pie or a wheel, is drawn on this shape.
 */
export const CELL_ASPECT = PAGE_PIXELS.across / COLUMNS / (PAGE_PIXELS.down / ROWS);
