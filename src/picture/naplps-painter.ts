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

/**
 * One step of the operand's precision in the design picture, rounded up to whole design pixels: across, the
 * picture's width is the unit's, so 640/256 is 2.5; down, the display shows 25/32 of the unit, so 480/200 is 2.4.
 * A coordinate written at that precision lands within half a step of where it was meant to be.
 */
export const OVERFILL_ACROSS = Math.ceil(naplpsLimits.OBJECT_PICTURE_WIDTH / UNIT_STEPS);
export const OVERFILL_DOWN = Math.ceil(
  (naplpsLimits.OBJECT_PICTURE_HEIGHT * naplpsLimits.DISPLAY_HEIGHT_DENOMINATOR) / (UNIT_STEPS * naplpsLimits.DISPLAY_HEIGHT_NUMERATOR),
);

/** Which edges of a rectangle are grown by a step of the operand's precision. */
interface Grown {
  readonly left: boolean;
  readonly top: boolean;
  readonly right: boolean;
  readonly bottom: boolean;
}

/** `box` grown by a whole step of the operand's precision at each edge `grown` names, within the design picture. */
function grow(box: DesignBox, grown: Grown): DesignBox {
  const left = grown.left ? Math.max(box.x - OVERFILL_ACROSS, 0) : box.x;
  const top = grown.top ? Math.max(box.y - OVERFILL_DOWN, 0) : box.y;
  const right = grown.right ? Math.min(box.x + box.width + OVERFILL_ACROSS, naplpsLimits.OBJECT_PICTURE_WIDTH) : box.x + box.width;
  const bottom = grown.bottom ? Math.min(box.y + box.height + OVERFILL_DOWN, naplpsLimits.OBJECT_PICTURE_HEIGHT) : box.y + box.height;
  return { x: left, y: top, width: right - left, height: bottom - top };
}

/** `box` grown by a whole step of the operand's precision at each edge it shares with `clip`, the rectangle of the object it is drawn in, which cuts it there exactly (Reach). */
export function overfilled(box: DesignBox, clip: DesignBox): DesignBox {
  return grow(box, {
    left: box.x === clip.x,
    top: box.y === clip.y,
    right: box.x + box.width === clip.x + clip.width,
    bottom: box.y + box.height === clip.y + clip.height,
  });
}

/**
 * Where a painter's fills reach past their cells (TODO-6840). A filled rectangle written at three-byte precision
 * cannot end on most of the raster's cell edges: a step is 2.31 raster lines and 1.875 dots, so a cell's edge is
 * written up to half a step away and a fill can fall short of its cell by a line or a dot, which nothing then
 * paints. Where what lies past the edge hides what a fill reaches into, the fill is grown there by a whole step,
 * so that it covers every pixel of its cell:
 * - `clip`, in an object, is the object's rectangle. The renderer keeps exactly the canvas pixels whose centre
 *   lies in it (ANIM-11, DEC-6829), so a fill grown past it is cut exactly at the cell's edge.
 * - `drawnOver` says whether a cell is drawn by an object composed over this drawing (over the stream, or after
 *   this object in order of layer, order and number, ANIM-11), which paints every pixel of its cells.
 */
export interface Reach {
  readonly clip: DesignBox | null;
  readonly drawnOver: (row: number, column: number) => boolean;
}

/** Whether the cell at `row`, `column` lies outside `clip`, where the renderer cuts what is drawn in it. */
function outsideClip(clip: DesignBox | null, row: number, column: number): boolean {
  if (clip === null) {
    return false;
  }
  const cell = cellsBox(row, column, 1, 1);
  return cell.x + cell.width <= clip.x || cell.x >= clip.x + clip.width || cell.y + cell.height <= clip.y || cell.y >= clip.y + clip.height;
}

/** Draws cells on a NAPLPS builder. */
export class NaplpsPainter implements CellPainter {
  readonly #builder: Naplps;
  readonly #reach: Reach | null;

  constructor(builder: Naplps, reach: Reach | null = null) {
    this.#builder = builder;
    this.#reach = reach;
  }

  fill(row: number, column: number, width: number, height: number, entry: number): void {
    const cells = cellsBox(row, column, width, height);
    if (cells.height <= 0) {
      return;
    }
    this.#builder.pen(entry);
    if (this.#reach === null) {
      this.#rect(cells);
    } else {
      this.#reaching(row, column, width, height, this.#reach);
    }
  }

  /** A fill split where the cells above or below it change between drawn over and not, each piece grown where `reach` lets it. */
  #reaching(row: number, column: number, width: number, height: number, { clip, drawnOver }: Reach): void {
    const rows = Array.from({ length: height }, (_, index) => row + index);
    const above = (at: number): boolean => drawnOver(row - 1, at);
    const below = (at: number): boolean => drawnOver(row + height, at);
    const whole = cellsBox(row, column, width, height);
    const clipTop = clip !== null && whole.y === clip.y;
    const clipBottom = clip !== null && whole.y + whole.height === clip.y + clip.height;
    let start = column;
    while (start < column + width) {
      let end = start + 1;
      while (end < column + width && above(end) === above(start) && below(end) === below(start)) {
        end += 1;
      }
      const piece = cellsBox(row, start, end - start, height);
      const top = clipTop || above(start);
      const bottom = clipBottom || below(start);
      // A side grown with a grown top or bottom reaches a step into the diagonal cell, which must be cut or drawn
      // over too. An edge not grown may lie up to half a step past its cell whether or not a side is grown, as
      // two rows' fills always may, and the grown side carries that no further than the step it grows by.
      const hidden = (down: number, across: number): boolean => drawnOver(down, across) || outsideClip(clip, down, across);
      const cornerHidden = (across: number): boolean => (!top || hidden(row - 1, across)) && (!bottom || hidden(row + height, across));
      const sideHidden = (across: number): boolean => rows.every((each) => drawnOver(each, across)) && cornerHidden(across);
      const left = (clip !== null && piece.x === clip.x) || (start === column && sideHidden(start - 1));
      const right = (clip !== null && piece.x + piece.width === clip.x + clip.width) || (end === column + width && sideHidden(end));
      this.#rect(grow(piece, { left, top, right, bottom }));
      start = end;
    }
  }

  #rect(box: DesignBox): void {
    this.#builder.rect(box.x, box.y, box.width, box.height, { filled: true });
  }

  sixel(row: number, column: number, across: number, down: number, separated: boolean, entry: number): void {
    const above = SIXEL_HEIGHTS.slice(0, down).reduce((sum, lines) => sum + lines, 0);
    const top = naplpsLine(RASTER_ROW_LINES * row + above);
    const gap = separated ? SEPARATED_GAP : 0;
    const height = naplpsLine(RASTER_ROW_LINES * row + above + (SIXEL_HEIGHTS[down] ?? 0)) - top - gap;
    const width = NAPLPS_SIXEL_WIDTH - gap;
    if (height > 0 && width > 0) {
      const box = { x: naplpsX(column) + across * NAPLPS_SIXEL_WIDTH, y: top, width, height };
      // A sixel on its object's edge falls short of it as a background would (Reach).
      this.#builder.pen(entry);
      const clip = this.#reach?.clip ?? null;
      this.#rect(clip === null ? box : overfilled(box, clip));
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
