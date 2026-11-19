// The cell grid a picture page is drawn on (renderer parity PAR-42,
// DEC-6760 item 15): the 40 columns and the rows 1 to 23 of the teletext
// page, so that a component lays out as it does on teletext. Rows 0 and 24
// are the teletext page beneath, which the receiver draws above and below
// the picture (PAR-31).
//
// ReGIS: a cell is 20 by 20 picture pixels, row r at y = 10 + 20 (r - 1)
// and column c at x = 20 c, so the 23 rows and their two margins of 10 are
// the 480 lines of the screen and the 40 columns its 800 pixels.
//
// NAPLPS: a cell is the teletext raster's own, 12 dots by 20 lines, row r
// on lines 20 r to 20 r + 19 and column c on dots 12 c to 12 c + 11, and is
// written as those dots, since every coordinate NeoTeletext defines on a
// NAPLPS page is a dot of the 480 by 500 raster (DEC-6853; neoteletext-common
// docs/naplps-raster.md RAS-7). The picture is shown on the display area of
// lines 20 to 479, rows 1 to 23 exactly (DEC-6857, REQ-5819).

import { Colour, COLUMNS, naplpsLimits, regisLimits, ROWS } from "../kit.ts";

export { Colour, COLUMNS };

/** The first and last rows a picture shows: the header row and row 24 stay the teletext page's. */
export const FIRST_TEXT_ROW = 1;
export const LAST_TEXT_ROW = ROWS - 2;

/** A ReGIS cell's side in picture pixels. */
export const REGIS_CELL = 20;
/** The ReGIS picture's top and bottom margins, in the page's background. */
export const REGIS_MARGIN = 10;
/** The unit cell width PAR-10 shapes the text to: the teletext cell's 12 dots at their 16/13 shape on a 20-pixel row (DEC-2049). */
const REGIS_SHAPED_WIDTH = 15;
/**
 * A unit cell's width is a multiple of the 8-pixel character cell, and a
 * width between two is drawn at "the next smaller size" (VT330/VT340
 * Programmer Reference Manual, volume 2, chapter 7, "Unit Cell Size"), so
 * 15 would draw each glyph 8 pixels wide.
 */
const REGIS_UNIT_WIDTH_STEP = 8;
/** The unit cell text is written in (`T(U[16,20])` in the display cell `T(S[20,20])`): the multiple of the step no narrower than the shaped width (DEC-6818). */
export const REGIS_TEXT_WIDTH = Math.ceil(REGIS_SHAPED_WIDTH / REGIS_UNIT_WIDTH_STEP) * REGIS_UNIT_WIDTH_STEP;
if (REGIS_TEXT_WIDTH > REGIS_CELL) {
  throw new Error("the ReGIS unit cell does not fit its display cell");
}

// The grid is the whole ReGIS screen, by the renderer's own limits.
const REGIS_ROWS_SHOWN = LAST_TEXT_ROW - FIRST_TEXT_ROW + 1;
if (COLUMNS * REGIS_CELL !== regisLimits.SCREEN_WIDTH || REGIS_ROWS_SHOWN * REGIS_CELL + 2 * REGIS_MARGIN !== regisLimits.SCREEN_HEIGHT) {
  throw new Error("the ReGIS cell grid does not fill the renderer's screen (SCREEN_WIDTH, SCREEN_HEIGHT)");
}

/** A mosaic cell's sixels: two across, each half the cell; three down, 7, 7 and 6 pixels (ReGIS) or raster lines (NAPLPS) from the top, since 20 does not divide by three (PAR-42). */
export const REGIS_SIXEL_WIDTH = REGIS_CELL / 2;
export const SIXEL_HEIGHTS: readonly [number, number, number] = [7, 7, 6];
if (SIXEL_HEIGHTS.reduce((sum, height) => sum + height, 0) !== REGIS_CELL) {
  throw new Error("the ReGIS sixel rows do not fill a cell");
}

/** The left of column `column` in ReGIS pixels. */
export function regisX(column: number): number {
  return REGIS_CELL * column;
}

/** The top of row `row` in ReGIS pixels. */
export function regisY(row: number): number {
  return REGIS_MARGIN + REGIS_CELL * (row - FIRST_TEXT_ROW);
}

/** A NAPLPS cell's dots across: the raster's dots shared by the teletext page's columns (RAS-1, RAS-7). */
export const RASTER_CELL_DOTS = naplpsLimits.RASTER_WIDTH / COLUMNS;
if (!Number.isInteger(RASTER_CELL_DOTS)) {
  throw new TypeError("the raster is not a whole number of dots a column (RASTER_WIDTH)");
}
/** A NAPLPS cell's lines down: one teletext row of the raster (RAS-1). */
export const { RASTER_ROW_LINES } = naplpsLimits;
// The rows a picture shows are exactly the NAPLPS display area (DEC-6857 item 1): its first line is row 1's, its last row 23's.
if (
  naplpsLimits.DISPLAY_FIRST_LINE !== FIRST_TEXT_ROW * RASTER_ROW_LINES ||
  naplpsLimits.DISPLAY_FIRST_LINE + naplpsLimits.DISPLAY_LINES !== (LAST_TEXT_ROW + 1) * RASTER_ROW_LINES
) {
  throw new Error("the NAPLPS display area (DISPLAY_FIRST_LINE, DISPLAY_LINES) is not the picture's rows");
}

/** The raster's first dot of column `column`, and first line of row `row`. */
export function rasterDot(column: number): number {
  return RASTER_CELL_DOTS * column;
}
export function rasterLine(row: number): number {
  return RASTER_ROW_LINES * row;
}

/** The eight Level 1 colours as red, green and blue, each on or off (EN 300 706 Table 30, CLUT 0). */
export const LEVEL_1_PRIMARIES: readonly (readonly [boolean, boolean, boolean])[] = [
  [false, false, false],
  [true, false, false],
  [false, true, false],
  [true, true, false],
  [false, false, true],
  [true, false, true],
  [false, true, true],
  [true, true, true],
];
