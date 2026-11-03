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
// over the page comes, a button held or not (DOC-1945), so
// nothing is declared for the pointer's moves. A component asks for Level 2.5 display
// attributes, which take no cell, at a cell of its own (enhancement.ts),
// over a level 1 row that reads without them.
//
// Text is Unicode in the component's language, which the server encodes
// (DEC-2199): a component hands the canvas cells, each a code (an
// attribute, a mosaic) or a string (one character with its marks, as the
// kit's textCells gives them), and the canvas writes each stretch of
// strings as a run of text in its language. Every language takes one row a
// line (DEC-2239). Double height is the policy of DEC-2222: never on rows 0,
// 22, 23 and 24.

import {
  Attribute,
  Colour,
  COLUMNS,
  type LanguageTag,
  mosaicColour,
  type Screen,
  type Sixels,
  SIXELS_ACROSS,
  SIXELS_DOWN,
  textCells,
  textColour,
} from "../kit.ts";
import {
  backgroundCodes,
  BLACK_BACKGROUND_CELLS,
  type CanvasCell,
  CHIP_TAIL,
  type Declared,
  NEW_BACKGROUND_CELL,
  nothingDeclared,
  type PageRequests,
  type Region,
  writeLine,
} from "./canvas-parts.ts";
import { CanvasDeclarations } from "./canvas-declarations.ts";
import { asWritten, ENGLISH, languageOf, type TextLanguage } from "./language.ts";
import type { Box } from "./layout.ts";

/** The language of the marks a component draws for itself: English, whose set has the arrows and signs they use. */
const MARK_LANGUAGE: LanguageTag = ENGLISH;

/** The rows double height never takes (DEC-2222 item 4): the header; the hint and Fastext rows, whose row below is not the page's to cover; and row 22, whose row below is the hint row. */
const NO_DOUBLE_HEIGHT_ROWS: ReadonlySet<number> = new Set([0, 22, 23, 24]);

export { backgroundCodes, centredOnChip, CHIP_CELLS, CHIP_HEAD_CELLS, NEW_BACKGROUND_CELL, nothingDeclared } from "./canvas-parts.ts";
export type { CanvasCell, Declared, PageRequests, Region } from "./canvas-parts.ts";
export { ownCodesOf, type TextLanguage } from "./language.ts";

export class Canvas extends CanvasDeclarations {
  readonly #screen: Screen;
  /** The background the component is drawn on: black, or the band of a component round it (Component.innerBackground), which a band of its own ends back to. */
  readonly #surround: Colour;
  /** The rows whose band ends back to the surround's, written once the component has painted (finish), so no text of its own falls on them. */
  readonly #bandRows = new Set<number>();
  /** The language of the component's text, with the stand-in for the channel's words where it has one. */
  readonly language: TextLanguage;

  constructor(
    screen: Screen,
    box: Box,
    requests: PageRequests,
    regions: Region[] = [],
    declared: Declared = nothingDeclared(),
    surround: Colour = Colour.Black,
    language: TextLanguage = languageOf(ENGLISH, []),
  ) {
    super(box, requests, regions, declared);
    this.#screen = screen;
    this.#surround = surround;
    this.language = language;
  }

  /** Whether the component's language is written right to left: its text aligns to the right, and what it lays out in a row runs from the right. */
  get rightToLeft(): boolean {
    return this.language.direction === "rtl";
  }

  /** Declares the band `background` sets from `column` on `height` rows from `row` as a control, and with an `id` a region: from its New Background cell to the cell before the Black Background that ends it. */
  bandControl(row: number, column: number, height = 1, id?: string): void {
    this.control(row, column + NEW_BACKGROUND_CELL, this.bandEnd - column - NEW_BACKGROUND_CELL, height, id);
  }

  /** Declares the chip drawn from `column`, which `chip` answered `after` for, as a control, and with an `id` a region: its band, from New Background to the cell before Black Background, the space after its text too. */
  chipControl(row: number, column: number, after: number, id?: string): void {
    this.control(row, column + NEW_BACKGROUND_CELL, after - column - NEW_BACKGROUND_CELL - BLACK_BACKGROUND_CELLS, 1, id);
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

  /**
   * Writes `cells` at `row`, `column` of the box, cut at its edge: each
   * code as it is, and each stretch of strings as a run of text in the
   * component's language, or in `language` for a mark the component draws
   * for itself (mark).
   */
  codes(row: number, column: number, cells: readonly CanvasCell[], language: LanguageTag = this.language.tag): void {
    if (row < 0 || row >= this.box.height) {
      return;
    }
    const written = language === this.language.tag ? this.language : languageOf(language, []);
    writeLine(this.#screen, this.box, row, column, cells, written);
  }

  /**
   * Writes `cells` as `codes` does, its text never as the channel's
   * stand-in (stand-in.ts): what a viewer typed, and the Fastext row's
   * prompts, which must read as they are written.
   */
  asWritten(row: number, column: number, cells: readonly CanvasCell[]): void {
    if (row < 0 || row >= this.box.height) {
      return;
    }
    writeLine(this.#screen, this.box, row, column, cells, asWritten(this.language));
  }

  /**
   * Writes a mark the component draws for itself (an arrow, a sort mark, a
   * separator), after the colour `foreground` takes a cell when it is
   * given: in English, whose set every page reaches whatever its language
   * (REQ-2152 item 6), so a mark is never one a language's own sets lack.
   * Answers the column after it.
   */
  mark(row: number, column: number, text: string, foreground: Colour | null = null): number {
    const cells = [...(foreground === null ? [] : [textColour(foreground)]), ...textCells(text)];
    this.codes(row, column, cells, MARK_LANGUAGE);
    return column + cells.length;
  }

  code(row: number, column: number, code: number): void {
    this.codes(row, column, [code]);
  }

  /** Writes `text` as it is, no attribute before it. */
  text(row: number, column: number, text: string): void {
    this.codes(row, column, textCells(text));
  }

  /** Writes `text` in `colour`: the colour takes the cell at `column`, the text follows. */
  coloured(row: number, column: number, foreground: Colour, text: string): void {
    this.codes(row, column, [textColour(foreground), ...textCells(text)]);
  }

  /** Writes the attribute `code`, then `text` in `colour`. */
  attributed(row: number, column: number, code: number, foreground: Colour, text: string): void {
    this.codes(row, column, [code, textColour(foreground), ...textCells(text)]);
  }

  /**
   * The column a text of `width` cells starts at in the box from `column`
   * to the box's end less `end` cells: `column` left to right, flush with
   * the right edge right to left.
   */
  start(width: number, column = 0, end = 0): number {
    return this.rightToLeft ? Math.max(column, this.box.width - end - width) : column;
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
    const end = this.#surround === Colour.Black ? [...textCells(CHIP_TAIL), Attribute.BlackBackground] : [textColour(this.#surround), Attribute.NewBackground];
    const codes = [...backgroundCodes(background), textColour(foreground), ...textCells(text), ...end];
    this.codes(row, column, codes);
    return column + codes.length;
  }

  /** Writes mosaic `codes` in `colour` from `column`: the colour takes the cell at `column`. Answers the column after them. */
  mosaics(row: number, column: number, foreground: Colour, codes: readonly number[]): number {
    this.codes(row, column, [mosaicColour(foreground), ...codes]);
    return column + 1 + codes.length;
  }

  /** Whether double height may be drawn on `row` of the box (DEC-2222): not on rows 0, 22, 23 and 24 of the page. */
  doubleHeightAllowed(row: number): boolean {
    return !NO_DOUBLE_HEIGHT_ROWS.has(this.box.row + row);
  }

  /**
   * Writes double-height `text`: the row below is covered across the whole
   * page (clause 12.3). Where double height is not allowed
   * (doubleHeightAllowed), the text is single height: Normal Size takes the
   * attribute's cell.
   */
  doubleHeight(row: number, column: number, foreground: Colour, text: string): void {
    const height = this.doubleHeightAllowed(row) ? Attribute.DoubleHeight : Attribute.NormalHeight;
    this.attributed(row, column, height, foreground, text);
  }

  /**
   * Writes a line of `text` in `foreground` from `column`: in double height
   * when `doubleHeight` asks and the row allows it (doubleHeightAllowed),
   * Double Height then taking the cell at `column` before the colour's;
   * otherwise single height, as `coloured` writes it. Answers the cells it
   * takes before the text: one, or two in double height.
   */
  line(row: number, column: number, foreground: Colour, text: string, doubleHeight = false): number {
    if (doubleHeight && this.doubleHeightAllowed(row)) {
      this.attributed(row, column, Attribute.DoubleHeight, foreground, text);
      return 2;
    }
    this.coloured(row, column, foreground, text);
    return 1;
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

  /** The code at `row`, `column` of the box. */
  at(row: number, column: number): number {
    return this.#screen.at(this.box.row + row, this.box.column + column);
  }
}
