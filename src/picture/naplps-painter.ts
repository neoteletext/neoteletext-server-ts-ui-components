// Cells drawn in NAPLPS on the grid of PAR-42 (renderer parity;
// cell-drawing.ts says what is drawn), in the 640 by 480 design picture of
// ANIM-11 as the kit's builder writes it, at its four-byte precision (ANSI
// X3.110-1983 section 5.3.2.2.3; DEC-6849): a background or a sixel is a
// filled RECTANGLE (section 5.3.3.4.5) covering exactly its raster pixels,
// so cells meet exactly within a drawing and between drawings, and no fill
// reaches past its cells; text is written in a field 1/40 of
// the unit screen wide and 20 raster lines high (PAR-10), TEXT (section
// 5.3.2.11) sent before each part since an object's macro starts from
// RESET's presentation state (ANIM-11), and from the foot of its row, since
// a character field lies up and to the right of the drawing point.

import { COLUMNS, type LanguageTag, type Naplps, naplpsLimits } from "../kit.ts";
import type { CellPainter } from "./cell-drawing.ts";
import {
  DISPLAY_LINES,
  NAPLPS_COLUMN,
  naplpsDotCentre,
  naplpsLineCentre,
  naplpsX,
  naplpsY,
  RASTER_CELL_DOTS,
  RASTER_ROW_LINES,
  rasterDot,
  rasterLine,
  SIXEL_HEIGHTS,
} from "./grid.ts";

/** A mosaic cell's sixels are half a raster cell across. */
const SIXEL_DOTS = RASTER_CELL_DOTS / 2;
/** A separated sixel leaves its right 2 dots and bottom 2 raster lines out (EN 300 706 Table 26, Separated Mosaic Graphics). */
const SEPARATED_GAP_DOTS = 2;
const SEPARATED_GAP_LINES = 2;

// Section 5.3.1 and Figure 11: a multi-value operand's bytes carry three bits of x and three of y each, after the data bit.
const OPERAND = 0x40;
const AXIS_BITS_PER_BYTE = 3;
/**
 * The TEXT field's operand is written in four bytes, in the domain the kit's builder selects before these bytes
 * (DEC-6849). PAR-10 states the field at a three-byte operand's precision, where 1/40 of the unit screen is 6/256,
 * 11.25 dots: each character then advanced three quarters of a dot short of its 12-dot cell, and a line's 32nd
 * character was drawn two cells left of its own (the poll's counts, measured on the goldens of format 4). In four
 * bytes it is 51/2048, 11.95 dots, under two dots short at a line's end; 1/40 is no binary fraction, so no length is
 * exact.
 */
const OPERAND_BYTES = 4;
const AXIS_BITS = OPERAND_BYTES * AXIS_BITS_PER_BYTE;
/** The steps of one unit of the unit screen at that precision: the operand's top bit is its sign. */
const UNIT_STEPS = 2 ** (AXIS_BITS - 1);
const AXIS_MASK = 2 ** AXIS_BITS - 1;
const AXIS_BYTE_MASK = 2 ** AXIS_BITS_PER_BYTE - 1;
/** Shift Out, which invokes the PDI set, and TEXT (section 5.3.2.11): its text format bytes at their defaults, then the character field. */
const SHIFT_OUT = 0x0e;
const TEXT = 0x22;
const DEFAULT_TEXT_FORMAT = [OPERAND, OPERAND] as const;

/** A unit-screen fraction as an operand axis, in steps, rounded and within the operand's range. */
function steps(fraction: number): number {
  return Math.min(Math.max(Math.round(fraction * UNIT_STEPS), 0), UNIT_STEPS - 1);
}

/** The two-axis operand of `across` and `up` steps. */
function operand(across: number, up: number): number[] {
  const bytes: number[] = [];
  for (let shift = AXIS_BITS - AXIS_BITS_PER_BYTE; shift >= 0; shift -= AXIS_BITS_PER_BYTE) {
    bytes.push(OPERAND | ((((across & AXIS_MASK) >> shift) & AXIS_BYTE_MASK) << AXIS_BITS_PER_BYTE) | (((up & AXIS_MASK) >> shift) & AXIS_BYTE_MASK));
  }
  return bytes;
}

/** TEXT with the field of PAR-10: 1/40 of the unit screen across and `rows` raster rows of the display's 25/32 unit height. */
function textField(rows: number): Uint8Array {
  const high = (rows * RASTER_ROW_LINES * naplpsLimits.DISPLAY_HEIGHT_NUMERATOR) / (DISPLAY_LINES * naplpsLimits.DISPLAY_HEIGHT_DENOMINATOR);
  return new Uint8Array([SHIFT_OUT, TEXT, ...DEFAULT_TEXT_FORMAT, ...operand(steps(1 / COLUMNS), steps(high))]);
}

/** A rectangle of the design picture. */
export interface DesignBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** Cells as the design picture's rectangle. */
export function cellsBox(row: number, column: number, width: number, height: number): DesignBox {
  const y = naplpsY(row);
  return { x: naplpsX(column), y, width: width * NAPLPS_COLUMN, height: naplpsY(row + height) - y };
}

/** A run of raster pixels, first to last, each inclusive. */
interface Pixels {
  readonly firstDot: number;
  readonly lastDot: number;
  readonly firstLine: number;
  readonly lastLine: number;
}

/** Draws cells on a NAPLPS builder. */
export class NaplpsPainter implements CellPainter {
  readonly #builder: Naplps;

  constructor(builder: Naplps) {
    this.#builder = builder;
  }

  fill(row: number, column: number, width: number, height: number, entry: number): void {
    if (width <= 0 || height <= 0) {
      return;
    }
    this.#builder.pen(entry);
    this.#cover({
      firstDot: rasterDot(column),
      lastDot: rasterDot(column + width) - 1,
      firstLine: rasterLine(row),
      lastLine: rasterLine(row + height) - 1,
    });
  }

  /**
   * A filled RECTANGLE covering exactly `pixels`: it covers from the pixel its near corner rounds to through the pixel
   * its far corner rounds to (ANSI X3.110-1983 sections 5.3.3.4.1 and 5.3.2.2.6), so it is written from the centre of
   * the first pixel to the centre of the last, which four-byte coordinates place within a third of a pixel (DEC-6849).
   * A cell's fill therefore meets its neighbours' exactly, in one drawing or two, and reaches nothing beyond it.
   */
  #cover({ firstDot, lastDot, firstLine, lastLine }: Pixels): void {
    const x = naplpsDotCentre(firstDot);
    const y = naplpsLineCentre(firstLine);
    this.#builder.rect(x, y, naplpsDotCentre(lastDot) - x, naplpsLineCentre(lastLine) - y, { filled: true });
  }

  sixel(row: number, column: number, across: number, down: number, separated: boolean, entry: number): void {
    const above = SIXEL_HEIGHTS.slice(0, down).reduce((sum, lines) => sum + lines, 0);
    const firstDot = rasterDot(column) + across * SIXEL_DOTS;
    const firstLine = rasterLine(row) + above;
    const lastDot = firstDot + SIXEL_DOTS - 1 - (separated ? SEPARATED_GAP_DOTS : 0);
    const lastLine = firstLine + (SIXEL_HEIGHTS[down] ?? 0) - 1 - (separated ? SEPARATED_GAP_LINES : 0);
    if (lastDot >= firstDot && lastLine >= firstLine) {
      this.#builder.pen(entry);
      this.#cover({ firstDot, lastDot, firstLine, lastLine });
    }
  }

  text(row: number, column: number, text: string, language: LanguageTag | null, outside: boolean, entry: number, doubleHeight: boolean): void {
    const rows = doubleHeight ? 2 : 1;
    this.#builder
      .bytes(textField(rows))
      .pen(entry)
      .point(naplpsDotCentre(rasterDot(column)), naplpsLineCentre(rasterLine(row + rows) - 1))
      .text(text, { ...(language === null ? {} : { language }), ...(outside ? { outside } : {}) });
  }
}
