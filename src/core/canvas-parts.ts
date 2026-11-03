// What a canvas (canvas.ts) is made of and writes with: the cells a
// component hands it, the regions, requests and controls it collects, the
// codes of a band and a chip, and the writing of a row's cells, its text as
// runs in their languages for the server to encode (DEC-2199).

import { Attribute, Colour, type Screen, SPACE, textColour } from "../kit.ts";
import type { DisplayAttributes } from "./enhancement.ts";
import { FIRST_MARKED_ROW, LAST_MARKED_ROW, type TextLanguage, textRuns } from "./language.ts";
import type { Box } from "./layout.ts";

/** One cell as a component writes it: a code, or a string, one character and its marks, for the server to encode. */
export type CanvasCell = number | string;

/** A band's New Background is the cell after its colour's (EN 300 706 Table 26). */
export const NEW_BACKGROUND_CELL = 1;
/** The cell Black Background takes after a band. */
export const BLACK_BACKGROUND_CELLS = 1;
/** The space of band a chip keeps after its text, so the text does not run into the band's end as its ink's cell keeps it from the start. */
export const CHIP_TAIL = " ";

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
  cursor: { row: number; column: number; flags: number } | null;
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

/** The highest alphanumeric colour attribute (EN 300 706 Table 26: 0x00 to 0x07). */
const LAST_TEXT_COLOUR = 0x07;

/**
 * Gives a run's mark rows its letters' ink: the server writes the marks
 * into the rows above and below in whatever colour is in force there, and
 * on a band (New Background) that is the band's own colour, so the marks
 * vanish into it. The colour the letters' row last sets before `from`, in
 * the box, is written in the same cell of each mark row where that cell is
 * a space, which the marks then take (clause 12.2, Table 26).
 */
function inkMarkRows(screen: Screen, box: Box, page: number, from: number, markRows: number): void {
  let at = from - 1;
  while (at >= box.column && screen.at(page, at) > LAST_TEXT_COLOUR) {
    at -= 1;
  }
  if (at < box.column) {
    return;
  }
  const ink = screen.at(page, at);
  for (const row of [page - markRows, page + markRows]) {
    if (screen.at(row, at) === SPACE) {
      screen.code(row, at, ink);
    }
  }
}

/**
 * Writes `cells` on `row` of `box` from `column`, cut at the box's edge:
 * each code as it is, and each stretch of strings as runs of text in
 * `language` (textRuns), its words of Latin letters drawn as the language's
 * stand-in where it has one (stand-in.ts). A run whose marks take the rows
 * around it is written only where those rows are the box's own and the
 * page's (FIRST_MARKED_ROW), since its marks overwrite their cells;
 * elsewhere its cells are spaces, and the channel's words are left as
 * written, in English, which needs no mark rows. Right to left, the runs
 * are in visual order too: the text's first run takes its rightmost cells.
 */
export function writeLine(screen: Screen, box: Box, row: number, column: number, cells: readonly CanvasCell[], language: TextLanguage): void {
  if (row < 0 || row >= box.height) {
    return;
  }
  const page = box.row + row;
  const marksFit = row >= 1 && row < box.height - 1 && page >= FIRST_MARKED_ROW && page <= LAST_MARKED_ROW;
  const standIn = language.markRows === 0 || marksFit ? language.standIn : undefined;
  let text: string[] = [];
  let textAt = 0;
  const flush = (): void => {
    const shown = standIn === undefined ? text : standIn.cells(text).map(String);
    for (const run of textRuns(shown, language, marksFit)) {
      const from = box.column + textAt + (language.direction === "rtl" ? text.length - run.from - run.cells.length : run.from);
      if (run.language === language.tag && language.markRows > 0 && !marksFit) {
        screen.codes(
          page,
          from,
          run.cells.map(() => SPACE),
        );
      } else {
        screen.text(page, from, run.cells.join(""), run.language);
        if (run.language === language.tag && language.markRows > 0) {
          inkMarkRows(screen, box, page, from, language.markRows);
        }
      }
    }
    text = [];
  };
  cells.forEach((cell, offset) => {
    const at = column + offset;
    const inBox = at >= 0 && at < box.width;
    if (typeof cell === "string" && inBox) {
      if (text.length === 0) {
        textAt = at;
      }
      text.push(cell);
      return;
    }
    flush();
    if (inBox && typeof cell === "number") {
      screen.code(page, box.column + at, cell);
    }
  });
  flush();
}
