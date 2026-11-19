// Cells drawn in NAPLPS on the grid of PAR-42 (renderer parity;
// cell-drawing.ts says what is drawn), in dots of the teletext raster
// (DEC-6853; neoteletext-common docs/naplps-raster.md RAS-7), as the kit's
// builder writes them at six-byte precision (RAS-6): a background or a
// sixel is the builder's filled `rect` of exactly its dots (ANSI
// X3.110-1983 sections 5.3.3.4.1 and 5.3.2.2.6), so cells meet exactly
// within a drawing and between drawings, and no fill reaches past its
// cells; text is the builder's `text` at its cell, which writes the field of
// one Noto cell a character and the point at the cell's lower left before
// each part (RAS-8, DEC-6857 item 3), so nothing of an earlier part, or of
// RESET's presentation state an object's macro starts from (ANIM-11), is
// relied on.

import type { LanguageTag, Naplps } from "../kit.ts";
import type { CellPainter } from "./cell-drawing.ts";
import { RASTER_CELL_DOTS, RASTER_ROW_LINES, rasterDot, rasterLine, SIXEL_HEIGHTS } from "./grid.ts";

/** A mosaic cell's sixels are half a raster cell across. */
const SIXEL_DOTS = RASTER_CELL_DOTS / 2;
/** A separated sixel leaves its right 2 dots and bottom 2 raster lines out (EN 300 706 Table 26, Separated Mosaic Graphics). */
const SEPARATED_GAP_DOTS = 2;
const SEPARATED_GAP_LINES = 2;

/** A rectangle of the raster: its top left dot and line, and the dots across and lines down it covers (RAS-6). */
export interface RasterBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** The dots of `width` by `height` cells from row `row`, column `column` (RAS-7). */
export function cellsBox(row: number, column: number, width: number, height: number): RasterBox {
  return { x: rasterDot(column), y: rasterLine(row), width: width * RASTER_CELL_DOTS, height: height * RASTER_ROW_LINES };
}

/** Draws cells on a NAPLPS builder. */
export class NaplpsPainter implements CellPainter {
  readonly #builder: Naplps;

  constructor(builder: Naplps) {
    this.#builder = builder;
  }

  /** Exactly the dots of `box`, filled in `entry`: the builder's `rect` covers them and no other (RAS-6). */
  #cover({ x, y, width, height }: RasterBox, entry: number): void {
    this.#builder.pen(entry).rect(x, y, width, height, { filled: true });
  }

  fill(row: number, column: number, width: number, height: number, entry: number): void {
    if (width > 0 && height > 0) {
      this.#cover(cellsBox(row, column, width, height), entry);
    }
  }

  sixel(row: number, column: number, across: number, down: number, separated: boolean, entry: number): void {
    const above = SIXEL_HEIGHTS.slice(0, down).reduce((sum, lines) => sum + lines, 0);
    const width = SIXEL_DOTS - (separated ? SEPARATED_GAP_DOTS : 0);
    const height = (SIXEL_HEIGHTS[down] ?? 0) - (separated ? SEPARATED_GAP_LINES : 0);
    if (width > 0 && height > 0) {
      this.#cover({ x: rasterDot(column) + across * SIXEL_DOTS, y: rasterLine(row) + above, width, height }, entry);
    }
  }

  /**
   * Text from its cell, one Noto cell a character (RAS-8). Double height is drawn single, on its upper row: the kit's
   * `text` writes the field of one cell and no other, and is the one writer of a text part (DEC-6889).
   */
  text(row: number, column: number, text: string, language: LanguageTag | null, outside: boolean, entry: number): void {
    this.#builder.pen(entry).text(text, { row, column, ...(language === null ? {} : { language }), ...(outside ? { outside } : {}) });
  }
}
