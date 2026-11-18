// What each cell of a page's rows 1 to 23 shows, read from its codes as a
// Level 1 receiver reads them (EN 300 706 clause 12.2, Table 26), so that a
// picture page shows what the same components show on a teletext page
// (renderer parity PAR-42). A row starts in white alphanumerics on black;
// each spacing attribute takes its cell and acts on the cells after it
// ("set-after") or on its own cell too ("set-at"); a cell that holds an
// attribute shows a space in the background in force, or the held mosaic.
// A row with double height hides the row below (clause 12.3), whose cells
// then show the row above's background. Flash shows steady, since a picture
// is still; a box is the subtitle's and changes nothing on a page; a
// concealed cell shows a space, since a picture page has no reveal.

import { Colour, COLUMNS, LAST_TEXT_ROW } from "./grid.ts";
import type { RecordingScreen, WrittenText } from "./recording-screen.ts";

/** What a cell shows: nothing but its background, text, or a mosaic. */
export type CellContent =
  | { readonly kind: "space" }
  /** A character and its marks, in a run the server writes in its language's provided sets (PAR-21). */
  | { readonly kind: "text"; readonly written: WrittenText }
  /** Sixels set, a bit each as the cell's code has them (Table 47), and whether separated. */
  | { readonly kind: "mosaic"; readonly sixels: number; readonly separated: boolean };

/** One cell as shown. */
export interface PictureCell {
  readonly background: Colour;
  readonly foreground: Colour;
  readonly content: CellContent;
  /** Drawn twice as high, over the row below too (Double Height in force). */
  readonly doubleHeight: boolean;
  /** Its background reaches the row below, which is hidden: the row holds double height (clause 12.3). */
  readonly tall: boolean;
  /** The row above holds double height, so this row is not shown: nothing is drawn of this cell. */
  readonly covered: boolean;
}

/** Table 26's codes. */
const ALPHA_COLOURS = { first: 0x00, last: 0x07 } as const;
const MOSAIC_COLOURS = { first: 0x10, last: 0x17 } as const;
/** Flash (set-after) and Steady (0x09, set-at): a picture shows flash steady, so neither changes what it shows. */
const FLASH = 0x08;
const END_BOX = 0x0a;
const START_BOX = 0x0b;
const NORMAL_SIZE = 0x0c;
const DOUBLE_HEIGHT = 0x0d;
const DOUBLE_WIDTH = 0x0e;
const DOUBLE_SIZE = 0x0f;
const CONCEAL = 0x18;
const CONTIGUOUS = 0x19;
const SEPARATED = 0x1a;
const ESCAPE = 0x1b;
const BLACK_BACKGROUND = 0x1c;
const NEW_BACKGROUND = 0x1d;
const HOLD_MOSAICS = 0x1e;
const RELEASE_MOSAICS = 0x1f;
/** The first code that is a character rather than an attribute. */
const FIRST_CHARACTER = 0x20;
/** In mosaic mode, codes 0x40 to 0x5F show their character, "blast-through" (Table 47); the others are mosaics. */
const BLAST_THROUGH = { first: 0x40, last: 0x5f } as const;
/** Table 47: a mosaic's sixels are bits 0 to 4 and bit 6; bit 5 is always set. */
const LOW_SIXELS = 0x1f;
const BOTTOM_RIGHT_BIT = 0x40;
const BOTTOM_RIGHT_SIXEL = 0x20;
const SPACE = 0x20;
/** 0x7F shows a block filling the cell in every Latin G0 set (Table 36): drawn as a mosaic with every sixel. */
const BLOCK = 0x7f;
const EVERY_SIXEL = 0x3f;

const SPACE_CONTENT: CellContent = { kind: "space" };

/** A mosaic code's six sixels as six bits: top left, top right, middle left, middle right, bottom left, bottom right from bit 0. */
function sixelsOf(code: number): number {
  return (code & LOW_SIXELS) | ((code & BOTTOM_RIGHT_BIT) === 0 ? 0 : BOTTOM_RIGHT_SIXEL);
}

/** What one row's attributes have in force as it is read. */
class RowState {
  foreground: Colour = Colour.White;
  background: Colour = Colour.Black;
  mosaics = false;
  separated = false;
  concealed = false;
  doubleHeight = false;
  hold = false;
  held: CellContent = SPACE_CONTENT;
}

/** A character code with no text written over it, as text in Latin English: what the page's own codes show (the kit's own codes, TODO-2228). */
function codeText(code: number, row: number, column: number): WrittenText {
  // A run of its own per cell: the codes a component wrote are no run of the server's.
  return { text: String.fromCodePoint(code), run: -(row * COLUMNS + column + 1), language: null, outside: false, rightToLeft: false };
}

/** What a character cell shows in `state`, keeping the held mosaic. */
function characterContent(screen: RecordingScreen, row: number, column: number, code: number, state: RowState): CellContent {
  const written = screen.written(row, column);
  if (state.concealed) {
    return SPACE_CONTENT;
  }
  if (written !== null) {
    return { kind: "text", written };
  }
  const isMosaic = state.mosaics && (code < BLAST_THROUGH.first || code > BLAST_THROUGH.last);
  if (isMosaic) {
    const mosaic: CellContent = { kind: "mosaic", sixels: sixelsOf(code), separated: state.separated };
    state.held = mosaic;
    return mosaic;
  }
  if (code === BLOCK) {
    return { kind: "mosaic", sixels: EVERY_SIXEL, separated: false };
  }
  return code === SPACE ? SPACE_CONTENT : { kind: "text", written: codeText(code, row, column) };
}

/** The Level 1 colours in the order of their codes (Table 26). */
const COLOURS: readonly Colour[] = [Colour.Black, Colour.Red, Colour.Green, Colour.Yellow, Colour.Blue, Colour.Magenta, Colour.Cyan, Colour.White];

/** The colour of a colour code's offset from its first, 0 to 7. */
function colourOf(offset: number): Colour {
  return COLOURS[offset] ?? Colour.White;
}

/** A cell as shown on a row of its own. */
function shownCell(cell: Omit<PictureCell, "tall" | "covered">, tall: boolean): PictureCell {
  return { background: cell.background, foreground: cell.foreground, content: cell.content, doubleHeight: cell.doubleHeight && tall, tall, covered: false };
}

/** A cell of the row below double height, which shows only the row above's background. */
function coveredCell(above: PictureCell): PictureCell {
  return { background: above.background, foreground: above.foreground, content: SPACE_CONTENT, doubleHeight: false, tall: false, covered: true };
}

/** Applies a set-at attribute before its cell is shown. */
function setAt(code: number, state: RowState): void {
  switch (code) {
    case NORMAL_SIZE: {
      if (state.doubleHeight) {
        state.held = SPACE_CONTENT;
      }
      state.doubleHeight = false;
      break;
    }
    case CONCEAL: {
      state.concealed = true;
      break;
    }
    case CONTIGUOUS: {
      state.separated = false;
      break;
    }
    case SEPARATED: {
      state.separated = true;
      break;
    }
    case BLACK_BACKGROUND: {
      state.background = Colour.Black;
      break;
    }
    case NEW_BACKGROUND: {
      state.background = state.foreground;
      break;
    }
    case HOLD_MOSAICS: {
      state.hold = true;
      break;
    }
    default: {
      break;
    }
  }
}

/** Applies a set-after attribute after its cell is shown. */
function setAfter(code: number, state: RowState): void {
  if (code >= ALPHA_COLOURS.first && code <= ALPHA_COLOURS.last) {
    state.foreground = colourOf(code - ALPHA_COLOURS.first);
    if (state.mosaics) {
      state.held = SPACE_CONTENT;
    }
    state.mosaics = false;
    state.concealed = false;
  } else if (code >= MOSAIC_COLOURS.first && code <= MOSAIC_COLOURS.last) {
    state.foreground = colourOf(code - MOSAIC_COLOURS.first);
    state.mosaics = true;
    state.concealed = false;
  } else if (code === DOUBLE_HEIGHT || code === DOUBLE_SIZE) {
    if (!state.doubleHeight) {
      state.held = SPACE_CONTENT;
    }
    state.doubleHeight = true;
  } else if (code === RELEASE_MOSAICS) {
    state.hold = false;
  }
  // FLASH, END_BOX, START_BOX, DOUBLE_WIDTH and ESCAPE change nothing a picture shows: double width is drawn single, the second G0 set is the server's to choose for text runs.
}

/** Whether `code` is one of Table 26's spacing attributes acting after its cell. */
function actsAfter(code: number): boolean {
  return (
    (code >= ALPHA_COLOURS.first && code <= ALPHA_COLOURS.last) ||
    (code >= MOSAIC_COLOURS.first && code <= MOSAIC_COLOURS.last) ||
    [FLASH, END_BOX, START_BOX, DOUBLE_HEIGHT, DOUBLE_WIDTH, DOUBLE_SIZE, ESCAPE, RELEASE_MOSAICS].includes(code)
  );
}

/** One row read: its cells, and whether it holds double height. */
function readRow(screen: RecordingScreen, row: number): { readonly cells: PictureCell[]; readonly holdsDoubleHeight: boolean } {
  const state = new RowState();
  const read: Omit<PictureCell, "tall" | "covered">[] = [];
  let holdsDoubleHeight = false;
  for (let column = 0; column < COLUMNS; column += 1) {
    const code = screen.at(row, column);
    let content: CellContent;
    if (code < FIRST_CHARACTER) {
      setAt(code, state);
      content = state.hold && state.mosaics && !state.concealed ? state.held : SPACE_CONTENT;
    } else {
      content = characterContent(screen, row, column, code, state);
    }
    read.push({ background: state.background, foreground: state.foreground, content, doubleHeight: state.doubleHeight });
    holdsDoubleHeight ||= state.doubleHeight || code === DOUBLE_HEIGHT || code === DOUBLE_SIZE;
    if (code < FIRST_CHARACTER && actsAfter(code)) {
      setAfter(code, state);
    }
  }
  // Double height on the last row a picture shows has no row below it in the picture: it is drawn single.
  const tall = holdsDoubleHeight && row < LAST_TEXT_ROW;
  return { cells: read.map((cell) => shownCell(cell, tall)), holdsDoubleHeight: tall };
}

/**
 * The cells of rows 1 to 23 of `screen` as shown, indexed by the page's
 * row (row 0, the header, is the teletext page's, drawn by the receiver
 * above the picture, and is left empty here).
 */
export function shownCells(screen: RecordingScreen): PictureCell[][] {
  const rows: PictureCell[][] = [[]];
  let above: PictureCell[] | null = null;
  for (let row = 1; row <= LAST_TEXT_ROW; row += 1) {
    if (above !== null) {
      // Clause 12.3: the row below a row with double height is not shown; the row above's backgrounds reach it.
      rows.push(above.map((cell) => coveredCell(cell)));
      above = null;
      continue;
    }
    const { cells, holdsDoubleHeight } = readRow(screen, row);
    rows.push(cells);
    above = holdsDoubleHeight ? cells : null;
  }
  return rows;
}
