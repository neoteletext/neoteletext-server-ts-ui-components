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
// NAPLPS: a cell is the teletext raster's own, 12 dots by 20 lines (row r
// on lines 20 r to 20 r + 19), written in the 640 by 480 design picture of
// ANIM-11 by the browser's mapping: across times 640/480, so a column is
// 16 design pixels; down, the 462 lines of the display area from line 19
// (DEC-6667, REQ-5819) times 480/462.

import { Colour, COLUMNS, naplpsLimits, regisLimits, ROWS } from "../kit.ts";

export { Colour, COLUMNS };

/** The first and last rows a picture shows: the header row and row 24 stay the teletext page's. */
export const FIRST_TEXT_ROW = 1;
export const LAST_TEXT_ROW = ROWS - 2;

/** A ReGIS cell's side in picture pixels. */
export const REGIS_CELL = 20;
/** The ReGIS picture's top and bottom margins, in the page's background. */
export const REGIS_MARGIN = 10;
/** The ReGIS character cell the text is written in (`T(S[20,20])`) and its unit cell (`T(U[15,20])`): 15 is the teletext cell's 12 dots at their 16/13 shape on a 20-pixel row (PAR-10, DEC-2049). */
export const REGIS_TEXT_WIDTH = 15;

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

/** The teletext raster a NAPLPS picture is shown on: a cell's dots across and lines down (the engine's 480 by 500 page). */
const RASTER_CELL_DOTS = 12;
export const RASTER_ROW_LINES = 20;
/** The raster's dots across, and the display area's first line and its lines (REQ-5819, DEC-6667). */
const RASTER_DOTS = COLUMNS * RASTER_CELL_DOTS;
const DISPLAY_FIRST_LINE = 19;
export const DISPLAY_LINES = 462;

/** The design picture's pixels a column takes: 12 dots times 640/480. */
export const NAPLPS_COLUMN = (RASTER_CELL_DOTS * naplpsLimits.OBJECT_PICTURE_WIDTH) / RASTER_DOTS;
if (!Number.isInteger(NAPLPS_COLUMN)) {
  throw new TypeError("a raster column is not a whole number of design pixels");
}

/** The left of column `column` in the design picture. */
export function naplpsX(column: number): number {
  return NAPLPS_COLUMN * column;
}

/** The design picture's line for raster line `line`, the nearest whole one: the browser's mapping from line 19, times 480/462. */
export function naplpsLine(line: number): number {
  const fromTop = Math.min(Math.max(line - DISPLAY_FIRST_LINE, 0), DISPLAY_LINES);
  return Math.round((fromTop * naplpsLimits.OBJECT_PICTURE_HEIGHT) / DISPLAY_LINES);
}

/** The top of row `row` in the design picture. */
export function naplpsY(row: number): number {
  return naplpsLine(RASTER_ROW_LINES * row);
}

/** A NAPLPS mosaic cell's sixels are half a column across. */
export const NAPLPS_SIXEL_WIDTH = NAPLPS_COLUMN / 2;

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
