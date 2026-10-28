// A component's view of the screen while it paints: its own box, in
// coordinates from the box's top-left, clipped to it. Teletext's spacing
// attributes take a cell each (EN 300 706 clause 12.2), so a coloured text
// spends its first cell on its colour, as the kit's `coloured` does, and a
// background, which runs to the row's end, is ended in the box's last cell
// when the box does not reach the row's end. A component that answers a
// press marks the cells that look pressable as a control (controls.ts):
// a band from its New Background cell to the cell before its Black
// Background, or a text from its first character. Given an id, a control
// is also a region of those cells, so the component acts on a click on
// exactly what the browser shows as pressable and nowhere else. Every move
// over the page comes, a button held or not (INPUT.md section 9.8), so
// nothing is declared for the pointer's moves. A component asks for Level 2.5 display
// attributes, which take no cell, at a cell of its own (enhancement.ts),
// over a level 1 row that reads without them.

import { Attribute, Colour, COLUMNS, englishCodes, mosaicColour, type Screen, type Sixels, SIXELS_ACROSS, SIXELS_DOWN, textColour } from "../kit.ts";
import type { DisplayAttributes } from "./enhancement.ts";
import type { Box } from "./layout.ts";

/** A band's New Background is the cell after its colour's (EN 300 706 Table 26). */
export const NEW_BACKGROUND_CELL = 1;
/** The cell Black Background takes after a band. */
const BLACK_BACKGROUND_CELLS = 1;
/** The space of band a chip keeps after its text, so the text does not run into the band's end as its ink's cell keeps it from the start. */
const CHIP_TAIL = " ";

/** The cells before a chip's text: its background's colour and New Background (backgroundCodes), then its ink. */
export const CHIP_HEAD_CELLS = 3;

/** The cells a chip takes beyond its text: its head, a space of band and Black Background after. */
export const CHIP_CELLS = CHIP_HEAD_CELLS + CHIP_TAIL.length + BLACK_BACKGROUND_CELLS;
/** The band a chip shows before its text: New Background's cell and the ink's. */
const CHIP_BAND_BEFORE_TEXT = CHIP_HEAD_CELLS - NEW_BACKGROUND_CELL;

/** `text` padded so that, on a chip, it has as much band after it as before: a mark or a sign then sits in the middle of its chip. */
export function centredOnChip(text: string): string {
  return `${text}${" ".repeat(CHIP_BAND_BEFORE_TEXT - CHIP_TAIL.length)}`;
}

/** A region a component marks as it paints, for knowing what a click is on: its name and its cells, on the page. */
export interface Region {
  readonly id: string;
  readonly row: number;
  readonly column: number;
  readonly width: number;
  readonly height: number;
}

/** What painting asks of the sub-page as a whole: its cursor, and the display attributes in its local enhancement data, in cells of the page. */
export interface PageRequests {
  cursor: { row: number; column: number; width: number; flags: number } | null;
  readonly displayAttributes: DisplayAttributes[];
}

/** What a component declares as it paints, in cells of the page: its controls. */
export interface Declared {
  readonly controls: Box[];
}

/** Nothing declared yet. */
export function nothingDeclared(): Declared {
  return { controls: [] };
}

/**
 * The two cells that set `background` from the second: its colour and New
 * Background; or, for black, Black Background in both, since black as a
 * colour code (alpha black) has no response at Level 1 (EN 300 706 Table
 * 26) and a page must read on a Level 1 decoder.
 */
export function backgroundCodes(background: Colour): [number, number] {
  return background === Colour.Black ? [Attribute.BlackBackground, Attribute.BlackBackground] : [textColour(background), Attribute.NewBackground];
}

export class Canvas {
  readonly box: Box;
  readonly #screen: Screen;
  readonly #requests: PageRequests;
  readonly #regions: Region[];
  readonly #declared: Declared;
  /** The background the component is drawn on: black, or the band of a component round it (Component.innerBackground), which a band of its own ends back to. */
  readonly #surround: Colour;
  /** The rows whose band ends back to the surround's, written once the component has painted (finish), so no text of its own falls on them. */
  readonly #bandRows = new Set<number>();

  constructor(
    screen: Screen,
    box: Box,
    requests: PageRequests,
    regions: Region[] = [],
    declared: Declared = nothingDeclared(),
    surround: Colour = Colour.Black,
  ) {
    this.#screen = screen;
    this.box = box;
    this.#requests = requests;
    this.#regions = regions;
    this.#declared = declared;
    this.#surround = surround;
  }

  /**
   * Marks `width` by `height` cells from `row`, `column` of the box as the
   * region `id`: a click there reaches the component with the region's id
   * (events.ts), so it need not lay itself out again to find what was hit.
   */
  region(id: string, row: number, column: number, width: number, height = 1): void {
    this.#regions.push({ id, row: this.box.row + row, column: this.box.column + column, width, height });
  }

  /** `width` by `height` cells from `row`, `column` of the box cut to the box, in cells of the page; null when nothing is left. */
  #inBox(row: number, column: number, width: number, height: number): Box | null {
    const top = Math.max(0, row);
    const left = Math.max(0, column);
    const across = Math.min(this.box.width, column + width) - left;
    const down = Math.min(this.box.height, row + height) - top;
    return across > 0 && down > 0 ? { row: this.box.row + top, column: this.box.column + left, width: across, height: down } : null;
  }

  /**
   * Declares `width` by `height` cells from `row`, `column` of the box, cut
   * to the box, as a control: cells a press acts on, which the browser
   * shows as it shows a link and lights under the pointer itself. With an
   * `id`, the same cells are the region `id`.
   */
  control(row: number, column: number, width: number, height = 1, id?: string): void {
    const cells = this.#inBox(row, column, width, height);
    if (cells === null) {
      return;
    }
    this.#declared.controls.push(cells);
    if (id !== undefined) {
      this.#regions.push({ id, ...cells });
    }
  }

  /** Declares the band `background` sets from `column` on `height` rows from `row` as a control, and with an `id` a region: from its New Background cell to the cell before the Black Background that ends it. */
  bandControl(row: number, column: number, height = 1, id?: string): void {
    this.control(row, column + NEW_BACKGROUND_CELL, this.bandEnd - column - NEW_BACKGROUND_CELL, height, id);
  }

  /** Declares the chip drawn from `column`, which `chip` answered `after` for, as a control, and with an `id` a region: its band, from New Background to the cell before Black Background, the space after its text too. */
  chipControl(row: number, column: number, after: number, id?: string): void {
    this.control(row, column + NEW_BACKGROUND_CELL, after - column - NEW_BACKGROUND_CELL - BLACK_BACKGROUND_CELLS, 1, id);
  }

  /**
   * Asks for display attributes `flags` (DisplayAttribute) from `row`,
   * `column` of the box, a cell of its own, in the sub-page's local
   * enhancement data (EN 300 706 Table 29, mode 01100): non-spacing, they
   * act from that cell to the end of the row or a further request there,
   * with DisplayAttribute.None ending them all. Seen at Level 2.5; the
   * level 1 row under them must read without them.
   */
  displayAttributes(row: number, column: number, flags: number): void {
    const cell = this.#inBox(row, column, 1, 1);
    if (cell !== null) {
      this.#requests.displayAttributes.push({ row: cell.row, column: cell.column, flags });
    }
  }

  /** The column a band `background` sets ends before: its Black Background in the box's last cell when the box stops short of the row's end, else the box's end. */
  get bandEnd(): number {
    return this.box.column + this.box.width < COLUMNS ? this.box.width - BLACK_BACKGROUND_CELLS : this.box.width;
  }

  get width(): number {
    return this.box.width;
  }

  get height(): number {
    return this.box.height;
  }

  /** Writes `codes` at `row`, `column` of the box, cut at its edge. */
  codes(row: number, column: number, codes: readonly number[]): void {
    if (row < 0 || row >= this.box.height) {
      return;
    }
    codes.forEach((code, offset) => {
      const at = column + offset;
      if (at >= 0 && at < this.box.width) {
        this.#screen.code(this.box.row + row, this.box.column + at, code);
      }
    });
  }

  code(row: number, column: number, code: number): void {
    this.codes(row, column, [code]);
  }

  /** Writes `text` as it is, no attribute before it. */
  text(row: number, column: number, text: string): void {
    this.codes(row, column, englishCodes(text));
  }

  /** Writes `text` in `colour`: the colour takes the cell at `column`, the text follows. */
  coloured(row: number, column: number, foreground: Colour, text: string): void {
    this.codes(row, column, [textColour(foreground), ...englishCodes(text)]);
  }

  /** Writes the attribute `code`, then `text` in `colour`. */
  attributed(row: number, column: number, code: number, foreground: Colour, text: string): void {
    this.codes(row, column, [code, textColour(foreground), ...englishCodes(text)]);
  }

  /**
   * Sets `background` from `column` across the box on `row` (its colour and
   * New Background take two cells), ending it when the box stops short of
   * the row's end: in its last cell with Black Background, on black; inside
   * another band, back to that band's colour, its colour and New Background
   * in its last two cells (finish), so the band round it goes on and shows
   * no black notch where this one ends.
   */
  background(row: number, column: number, background: Colour): void {
    this.codes(row, column, backgroundCodes(background));
    if (this.box.column + this.box.width >= COLUMNS) {
      return;
    }
    if (this.#surround === Colour.Black) {
      this.code(row, this.bandEnd, Attribute.BlackBackground);
    } else {
      this.#bandRows.add(row);
    }
  }

  /** The component has painted: each band that ends back to the surround's does so now, over whatever was drawn in its last two cells. */
  finish(): void {
    for (const row of this.#bandRows) {
      this.codes(row, this.bandEnd - 1, [textColour(this.#surround), Attribute.NewBackground]);
    }
  }

  /**
   * Writes `text` in `ink` on a `background` of its own from `column`, and
   * ends the background after it: the background's colour, New Background,
   * the ink and Black Background each take a cell (Table 26), and a space
   * of band before Black Background, whose own cell is already black (it
   * is set-at), keeps the text off the band's end as the ink's cell keeps
   * it off its start. It takes CHIP_CELLS more than the text.
   * Answers the column after it.
   */
  chip(row: number, column: number, background: Colour, foreground: Colour, text: string): number {
    // Inside another band, its tail's space is the surround's colour, which shows as the chip's band, and New Background brings the surround back: no black after it.
    const end =
      this.#surround === Colour.Black ? [...englishCodes(CHIP_TAIL), Attribute.BlackBackground] : [textColour(this.#surround), Attribute.NewBackground];
    const codes = [...backgroundCodes(background), textColour(foreground), ...englishCodes(text), ...end];
    this.codes(row, column, codes);
    return column + codes.length;
  }

  /** Writes mosaic `codes` in `colour` from `column`: the colour takes the cell at `column`. Answers the column after them. */
  mosaics(row: number, column: number, foreground: Colour, codes: readonly number[]): number {
    this.codes(row, column, [mosaicColour(foreground), ...codes]);
    return column + 1 + codes.length;
  }

  /** Writes double-height `text`: the row below is covered across the whole page (clause 12.3). */
  doubleHeight(row: number, column: number, foreground: Colour, text: string): void {
    this.attributed(row, column, Attribute.DoubleHeight, foreground, text);
  }

  /** Fills `count` cells from `column` with `code`. */
  fill(row: number, column: number, count: number, code: number): void {
    // No more than a row holds: a count from props is not taken on trust.
    this.codes(
      row,
      column,
      Array.from({ length: Math.max(0, Math.min(count, COLUMNS)) }, () => code),
    );
  }

  /** Draws `sixels` in `colour` with its top-left cell at `row`, `column`: the mosaic colour takes the cell before. */
  sixels(row: number, column: number, foreground: Colour, sixels: Sixels): void {
    const across = Math.ceil(sixels.width / SIXELS_ACROSS);
    const down = Math.ceil(sixels.height / SIXELS_DOWN);
    for (let cellRow = 0; cellRow < down; cellRow += 1) {
      if (column > 0) {
        this.code(row + cellRow, column - 1, mosaicColour(foreground));
      }
      for (let cellColumn = 0; cellColumn < across; cellColumn += 1) {
        this.code(row + cellRow, column + cellColumn, sixels.cell(cellColumn * SIXELS_ACROSS, cellRow * SIXELS_DOWN));
      }
    }
  }

  /** Places the input cursor at `row`, `column` of the box, with `width` cells to echo into. */
  cursor(row: number, column: number, width: number, flags: number): void {
    this.#requests.cursor = { row: this.box.row + row, column: this.box.column + column, width, flags };
  }

  /** The code at `row`, `column` of the box. */
  at(row: number, column: number): number {
    return this.#screen.at(this.box.row + row, this.box.column + column);
  }
}
