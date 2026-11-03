// Where the lines of a language whose marks take rows of their own (Thai,
// Lao: the server's mark_rows) go, as the engine's page writer lays them out
// (DEC-604): a line's upper marks on the row above its letters, its lower
// vowels on the row below, and that row shared with the next line's upper
// marks, so consecutive lines are two rows apart. A third row is needed only
// where one column needs both a lower vowel of one line and an upper mark of
// the next; the server refuses such a pair on one row (text_overlap, DEC-2221
// item 6), so the library gives the next line a row more there.

import { type Language, textCells } from "../kit.ts";
import type { CanvasCell } from "./canvas-parts.ts";
import type { TextLanguage } from "./language.ts";
import { oneLineRows } from "./text.ts";

/**
 * The Thai and Lao marks written below their letter (the engine's
 * write_text/thai_lao.rs LOWER_MARKS): sara u, sara uu, phinthu; Lao u, uu
 * and semivowel lo.
 */
const LOWER_MARKS: ReadonlySet<string> = new Set(["ุ", "ู", "ฺ", "ຸ", "ູ", "ຼ"]);
/** Every Thai and Lao combining mark (Unicode category Mn in the two blocks, the engine's is_mark); those not below are written above. */
const MARK = /[ัิ-ฺ็-๎ັິ-ຼ່-ໍ]/u;
/** Thai sara am, which the engine writes as nikhahit over the letter before it and sara aa in its own cell. */
const SARA_AM = "ำ";

/** Between consecutive marked lines: the shared mark row and the next letter row. */
const MARKED_PITCH = 2;

/** A line as it is drawn: its cells from `column` of its component's box, codes taking a cell each. */
export interface PlacedLine {
  readonly column: number;
  readonly cells: readonly CanvasCell[];
}

/** `text` from `column` as `language` draws it: its words as the stand-in where the language has one, which is where its marks are. */
export function placed(language: TextLanguage, column: number, text: string | readonly CanvasCell[]): PlacedLine {
  const cells = typeof text === "string" ? textCells(text) : text;
  return { column, cells: language.standIn === undefined ? cells : language.standIn.cells(cells) };
}

/** The columns of `line` that have a mark above their letter and those that have one below. */
function markColumns(line: PlacedLine): { readonly upper: ReadonlySet<number>; readonly lower: ReadonlySet<number> } {
  const upper = new Set<number>();
  const lower = new Set<number>();
  line.cells.forEach((cell, offset) => {
    if (typeof cell !== "string") {
      return;
    }
    const column = line.column + offset;
    for (const character of cell) {
      if (character === SARA_AM) {
        upper.add(column - 1);
      } else if (LOWER_MARKS.has(character)) {
        lower.add(column);
      } else if (MARK.test(character)) {
        upper.add(column);
      }
    }
  });
  return { upper, lower };
}

/** Whether `above`'s lower vowels and `below`'s upper marks need one column of a shared row (the engine's marked_rows clash). */
export function clashes(above: PlacedLine, below: PlacedLine): boolean {
  const { lower } = markColumns(above);
  const { upper } = markColumns(below);
  return [...lower].some((column) => upper.has(column));
}

/** Where a block's lines go: the row of each line's letters, and the rows of the block. */
export interface LineLayout {
  readonly rows: readonly number[];
  readonly height: number;
}

/**
 * The rows of `lines` in `language`, in double height or not (DEC-2222):
 * a row each, or two in double height; in a language with mark rows, the
 * first line's upper marks on the block's first row, each next line two
 * rows on (three after a clash), and the last line's lower vowels on the
 * block's last row. Double height is never drawn there.
 */
export function layLines(language: Language, lines: readonly PlacedLine[], doubleHeight = false): LineLayout {
  if (language.markRows === 0) {
    const pitch = oneLineRows(language, doubleHeight);
    return { rows: lines.map((_line, index) => index * pitch), height: lines.length * pitch };
  }
  const rows: number[] = [];
  let row = language.markRows;
  lines.forEach((line, index) => {
    const before = lines[index - 1];
    if (before !== undefined) {
      row += MARKED_PITCH + (clashes(before, line) ? language.markRows : 0);
    }
    rows.push(row);
  });
  return { rows, height: lines.length === 0 ? 0 : row + 1 + language.markRows };
}
