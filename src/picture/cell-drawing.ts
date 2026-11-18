// Drawing cells as a picture, the same for both languages (renderer parity
// PAR-42): each row's backgrounds as filled rectangles, one for each run of
// cells of one colour; each mosaic's sixels as filled rectangles; and each
// stretch of one run's text as a text part, which the server writes in the
// language's provided sets (PAR-21, DEC-6669), at its first cell. What a
// language writes for each is its painter's (regis-picture.ts,
// naplps-picture.ts).
//
// A component's looks (look.ts) are its own cells drawn again with its
// controls' cells changed: under the pointer each colour is the page's
// rollover colour, as the teletext receiver shows a control (rollover.ts);
// pressed, a control's ink and background change places.

import { ENGLISH } from "../core/language.ts";
import { type CellContent, type PictureCell } from "./cells.ts";
import { COLUMNS, FIRST_TEXT_ROW, LAST_TEXT_ROW } from "./grid.ts";
import type { LanguageTag } from "../kit.ts";
import type { CellBox } from "./scene.ts";

/** How a component is drawn: as it is, under the pointer, or pressed. */
export type Look = "plain" | "hover" | "pressed";

/** A colour as a picture's colour map holds it: the Level 1 colours are entries 0 to 7, their rollover colours 8 to 15. */
type MapEntry = number;

/** The colour map entry of a Level 1 colour's rollover colour, after the eight Level 1 colours. */
export const ROLLOVER_ENTRIES = 8;

/** What a language draws a cell's parts with, in cells of the page. */
export interface CellPainter {
  /** A filled rectangle of `width` cells across and `height` rows down from `row`, `column`. */
  fill(row: number, column: number, width: number, height: number, entry: MapEntry): void;
  /** The sixel at `across` (0 or 1) and `down` (0 to 2) of a mosaic cell, filled; a separated sixel is drawn smaller, apart from its neighbours. */
  sixel(row: number, column: number, across: number, down: number, separated: boolean, entry: MapEntry): void;
  /** Text at `row`, `column`, in `entry`, twice as high when `doubleHeight`. */
  text(row: number, column: number, text: string, language: LanguageTag | null, outside: boolean, entry: MapEntry, doubleHeight: boolean): void;
}

/** Which cells to draw and how: those `owner` is drawn in, with `controls` changed by `look`. */
export interface CellSelection {
  readonly owners: readonly (readonly number[])[];
  /** The owners whose cells are drawn. */
  readonly drawn: ReadonlySet<number>;
  readonly look: Look;
  readonly controls: readonly CellBox[];
  /** Whether the page has rollover colours; without, a hover look is drawn plain. */
  readonly rollover: boolean;
  /** The page's language, which a run naming none is written in. */
  readonly pageLanguage: LanguageTag;
  /** Only these rows; every row when absent. */
  readonly rows?: ReadonlySet<number>;
}

/** Bits of a mosaic's six sixels, two across and three down (cells.ts, sixelsOf). */
const SIXELS_ACROSS = 2;
const SIXELS_DOWN = 3;

function inBoxes(boxes: readonly CellBox[], row: number, column: number): boolean {
  return boxes.some((box) => row >= box.row && row < box.row + box.height && column >= box.column && column < box.column + box.width);
}

/** A cell's background and ink as map entries in `look`: a control's cells change, the others stay. */
function entriesOf(cell: PictureCell, inControl: boolean, look: Look, rollover: boolean): { readonly background: MapEntry; readonly ink: MapEntry } {
  if (!inControl || look === "plain" || (look === "hover" && !rollover)) {
    return { background: cell.background, ink: cell.foreground };
  }
  if (look === "hover") {
    return { background: cell.background + ROLLOVER_ENTRIES, ink: cell.foreground + ROLLOVER_ENTRIES };
  }
  return { background: cell.foreground, ink: cell.background };
}

/** Whether two cells' text belongs in one text part: one run (or both the page's own codes), one ink, one height. */
function sameStretch(a: CellContent, b: CellContent): boolean {
  if (a.kind !== "text" || b.kind !== "text") {
    return false;
  }
  const own = a.written.run < 0 && b.written.run < 0;
  return (own || a.written.run === b.written.run) && a.written.language === b.written.language && a.written.outside === b.written.outside;
}

/** One row being drawn: which of its cells are drawn, and each one's colours in the look drawn. */
interface RowDrawing {
  readonly row: number;
  readonly chosen: (column: number) => PictureCell | null;
  readonly entries: (column: number, cell: PictureCell) => { readonly background: MapEntry; readonly ink: MapEntry };
}

/** The row's backgrounds: a rectangle for each run of one colour and height. */
function drawBackgrounds({ row, chosen, entries }: RowDrawing, painter: CellPainter): void {
  let column = 0;
  while (column < COLUMNS) {
    const cell = chosen(column);
    if (cell === null) {
      column += 1;
      continue;
    }
    const { background } = entries(column, cell);
    const start = column;
    column += 1;
    for (let next = chosen(column); next !== null && next.tall === cell.tall && entries(column, next).background === background; next = chosen(column)) {
      column += 1;
    }
    painter.fill(row, start, column - start, cell.tall ? 2 : 1, background);
  }
}

/** A mosaic cell's sixels. */
function drawSixels({ row }: RowDrawing, column: number, content: Extract<CellContent, { kind: "mosaic" }>, ink: MapEntry, painter: CellPainter): void {
  for (let down = 0; down < SIXELS_DOWN; down += 1) {
    for (let across = 0; across < SIXELS_ACROSS; across += 1) {
      if ((content.sixels & (1 << (down * SIXELS_ACROSS + across))) !== 0) {
        painter.sixel(row, column, across, down, content.separated, ink);
      }
    }
  }
}

/** The text of the stretch that starts at `start`, as one part, and the column after it: a run's spaces are none of its cells (recording-screen.ts), so the stretch goes on over them to the run's next character. */
function stretchFrom(drawing: RowDrawing, start: number, cell: PictureCell, ink: MapEntry): { readonly text: string; readonly end: number } {
  const { content } = cell;
  let text = content.kind === "text" ? content.written.text : "";
  let column = start + 1;
  for (;;) {
    let after = column;
    while (drawing.chosen(after)?.content.kind === "space") {
      after += 1;
    }
    const next = drawing.chosen(after);
    if (next === null || !sameStretch(content, next.content) || drawing.entries(after, next).ink !== ink || next.doubleHeight !== cell.doubleHeight) {
      return { text, end: column };
    }
    text += " ".repeat(after - column) + (next.content.kind === "text" ? next.content.written.text : "");
    column = after + 1;
  }
}

/** The row's mosaics and text, over its backgrounds. */
function drawContents(drawing: RowDrawing, pageLanguage: LanguageTag, painter: CellPainter): void {
  let column = 0;
  while (column < COLUMNS) {
    const cell = drawing.chosen(column);
    if (cell?.content.kind === "mosaic") {
      drawSixels(drawing, column, cell.content, drawing.entries(column, cell).ink, painter);
    }
    if (cell?.content.kind !== "text") {
      column += 1;
      continue;
    }
    const { written } = cell.content;
    const ink = drawing.entries(column, cell).ink;
    const { text, end } = stretchFrom(drawing, column, cell, ink);
    const language = written.language ?? pageLanguage;
    painter.text(drawing.row, column, text, language === ENGLISH ? null : language, written.outside, ink, cell.doubleHeight);
    column = end;
  }
}

/** Draws the selected cells of `cells` with `painter`. */
export function drawCells(cells: readonly (readonly PictureCell[])[], selection: CellSelection, painter: CellPainter): void {
  for (let row = FIRST_TEXT_ROW; row <= LAST_TEXT_ROW; row += 1) {
    if (selection.rows !== undefined && !selection.rows.has(row)) {
      continue;
    }
    const line = cells[row] ?? [];
    const owners = selection.owners[row] ?? [];
    const drawing: RowDrawing = {
      row,
      chosen: (column) => {
        const cell = line[column];
        return cell !== undefined && !cell.covered && selection.drawn.has(owners[column] ?? -1) ? cell : null;
      },
      entries: (column, cell) => entriesOf(cell, inBoxes(selection.controls, row, column), selection.look, selection.rollover),
    };
    drawBackgrounds(drawing, painter);
    drawContents(drawing, selection.pageLanguage, painter);
  }
}
