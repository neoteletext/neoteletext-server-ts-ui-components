// Cells drawn in ReGIS on the grid of PAR-42 (renderer parity;
// cell-drawing.ts says what is drawn): a filled rectangle is `P` and `F(V…)`
// (the VT330/VT340 manual, chapters 4 to 6), one pixel short of the next
// cell since a filled path includes its edge; a text part is written at
// its cell's top left in the character cell of PAR-10, set before each
// part because a numbered drawing's contents start from a fresh context
// (regis-v2.md, "Rules for contents").

import { type LanguageTag, type Regis, type RegisTextOptions } from "../kit.ts";
import type { CellPainter } from "./cell-drawing.ts";
import { REGIS_CELL, SIXEL_HEIGHTS, REGIS_SIXEL_WIDTH, REGIS_TEXT_WIDTH, regisX, regisY } from "./grid.ts";

/** A separated sixel leaves its right and bottom pixels out, as a gap between it and the next (EN 300 706 Table 26, Separated Mosaic Graphics). */
const SEPARATED_GAP = 2;
/** ReGIS's text controls of PAR-42's grid, once for single height and once for double. */
function textCell(doubleHeight: boolean): string {
  const height = doubleHeight ? 2 * REGIS_CELL : REGIS_CELL;
  return `T(S[${REGIS_CELL},${height}])T(U[${REGIS_TEXT_WIDTH},${height}])`;
}

/** Draws cells on a ReGIS builder: rectangles one pixel short of the next cell, since a filled `V` path includes its edge. */
export class RegisPainter implements CellPainter {
  readonly #builder: Regis;

  constructor(builder: Regis) {
    this.#builder = builder;
  }

  fill(row: number, column: number, width: number, height: number, entry: number): void {
    this.#builder.box(regisX(column), regisY(row), width * REGIS_CELL - 1, height * REGIS_CELL - 1, { fill: true, pen: entry });
  }

  sixel(row: number, column: number, across: number, down: number, separated: boolean, entry: number): void {
    const above = SIXEL_HEIGHTS.slice(0, down).reduce((sum, height) => sum + height, 0);
    const gap = separated ? SEPARATED_GAP : 0;
    const width = REGIS_SIXEL_WIDTH - gap - 1;
    const height = (SIXEL_HEIGHTS[down] ?? 0) - gap - 1;
    if (width >= 0 && height >= 0) {
      this.#builder.box(regisX(column) + across * REGIS_SIXEL_WIDTH, regisY(row) + above, width, height, { fill: true, pen: entry });
    }
  }

  text(row: number, column: number, text: string, language: LanguageTag | null, outside: boolean, entry: number, doubleHeight: boolean): void {
    const options: RegisTextOptions = { ...(language === null ? {} : { language }), ...(outside ? { outside } : {}) };
    this.#builder.pen(entry).at(regisX(column), regisY(row)).bytes(textCell(doubleHeight)).text(text, options);
  }
}
