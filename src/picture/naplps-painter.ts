// Cells drawn in NAPLPS on the grid of PAR-42 (renderer parity;
// cell-drawing.ts says what is drawn), in the 640 by 480 design picture of
// ANIM-11 as the kit's builder writes it, at the default three-byte
// precision (ANSI X3.110-1983 section 5.3.1): a background or a sixel is a
// filled RECTANGLE (section 5.3.3.4.5); text is written in a field 1/40 of
// the unit screen wide and 20 raster lines high (PAR-10), TEXT (section
// 5.3.2.11) sent before each part since an object's macro starts from
// RESET's presentation state (ANIM-11), and from the foot of its row, since
// a character field lies up and to the right of the drawing point.

import { COLUMNS, type LanguageTag, type Naplps, naplpsLimits } from "../kit.ts";
import type { CellPainter } from "./cell-drawing.ts";
import { DISPLAY_LINES, NAPLPS_COLUMN, NAPLPS_SIXEL_WIDTH, naplpsLine, naplpsX, naplpsY, RASTER_ROW_LINES, SIXEL_HEIGHTS } from "./grid.ts";

/** A separated sixel leaves its right and bottom 2 design pixels out (EN 300 706 Table 26, Separated Mosaic Graphics). */
const SEPARATED_GAP = 2;

// Section 5.3.1 and Figure 11: a multi-value operand's bytes carry three bits of x and three of y each, after the data bit.
const OPERAND = 0x40;
const AXIS_BITS_PER_BYTE = 3;
const OPERAND_BYTES = 3;
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

/** Draws cells on a NAPLPS builder. */
export class NaplpsPainter implements CellPainter {
  readonly #builder: Naplps;

  constructor(builder: Naplps) {
    this.#builder = builder;
  }

  fill(row: number, column: number, width: number, height: number, entry: number): void {
    const box = cellsBox(row, column, width, height);
    if (box.height > 0) {
      this.#builder.pen(entry).rect(box.x, box.y, box.width, box.height, { filled: true });
    }
  }

  sixel(row: number, column: number, across: number, down: number, separated: boolean, entry: number): void {
    const above = SIXEL_HEIGHTS.slice(0, down).reduce((sum, lines) => sum + lines, 0);
    const top = naplpsLine(RASTER_ROW_LINES * row + above);
    const gap = separated ? SEPARATED_GAP : 0;
    const height = naplpsLine(RASTER_ROW_LINES * row + above + (SIXEL_HEIGHTS[down] ?? 0)) - top - gap;
    const width = NAPLPS_SIXEL_WIDTH - gap;
    if (height > 0 && width > 0) {
      this.#builder.pen(entry).rect(naplpsX(column) + across * NAPLPS_SIXEL_WIDTH, top, width, height, { filled: true });
    }
  }

  text(row: number, column: number, text: string, language: LanguageTag | null, outside: boolean, entry: number, doubleHeight: boolean): void {
    const rows = doubleHeight ? 2 : 1;
    this.#builder
      .bytes(textField(rows))
      .pen(entry)
      .point(naplpsX(column), naplpsY(row + rows))
      .text(text, { ...(language === null ? {} : { language }), ...(outside ? { outside } : {}) });
  }
}
